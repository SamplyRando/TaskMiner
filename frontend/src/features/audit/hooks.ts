import {
  type InfiniteData,
  type QueryClient,
  keepPreviousData,
  useInfiniteQuery,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";

import { connectAuditStream, listWorkspaceAudit } from "@/api/audit";
import { ApiError } from "@/api/client";
import { matchesAuditFilters } from "@/features/audit/filters";
import { publishUnauthorized } from "@/lib/auth-events";
import { useAuthStore } from "@/store/auth-store";
import type {
  AuditFeed,
  AuditFilters,
  AuditListParams,
  AuditLog,
  AuditStreamStatus,
} from "@/types/audit";

const AUDIT_PAGE_SIZE = 20;
const MAX_RECONNECT_DELAY = 10_000;

export const auditKeys = {
  all: ["audit"] as const,
  workspace: (workspaceId: string) => [...auditKeys.all, workspaceId] as const,
  list: (workspaceId: string, params: AuditListParams) =>
    [...auditKeys.workspace(workspaceId), params] as const,
  feeds: () => [...auditKeys.all, "infinite"] as const,
  feed: (workspaceId: string, filters: AuditFilters) =>
    [...auditKeys.feeds(), workspaceId, filters] as const,
};

export const useWorkspaceAudit = (
  workspaceId: string | null,
  params: AuditListParams,
) =>
  useQuery({
    enabled: workspaceId !== null,
    queryFn: () => {
      if (workspaceId === null) {
        throw new Error("A workspace is required to load audit logs.");
      }
      return listWorkspaceAudit(workspaceId, params);
    },
    queryKey: auditKeys.list(workspaceId ?? "none", params),
    staleTime: 30_000,
  });

export const useInfiniteWorkspaceAudit = (
  workspaceId: string | null,
  filters: AuditFilters,
) =>
  useInfiniteQuery<
    AuditFeed,
    Error,
    InfiniteData<AuditFeed, number>,
    ReturnType<typeof auditKeys.feed>,
    number
  >({
    enabled: workspaceId !== null,
    getNextPageParam: (lastPage, pages) => {
      const loaded = pages.reduce(
        (count, page) => count + page.items.length,
        0,
      );
      return loaded < lastPage.count ? loaded : undefined;
    },
    initialPageParam: 0,
    placeholderData: keepPreviousData,
    queryFn: ({ pageParam }) => {
      if (workspaceId === null) {
        throw new Error("A workspace is required to load audit logs.");
      }
      return listWorkspaceAudit(workspaceId, {
        ...filters,
        limit: AUDIT_PAGE_SIZE,
        offset: pageParam,
      });
    },
    queryKey: auditKeys.feed(workspaceId ?? "none", filters),
    staleTime: 30_000,
  });

export const prependRealtimeAudit = (
  queryClient: QueryClient,
  workspaceId: string,
  filters: AuditFilters,
  auditLog: AuditLog,
): void => {
  queryClient.setQueryData<InfiniteData<AuditFeed, number>>(
    auditKeys.feed(workspaceId, filters),
    (current) => {
      if (
        !current ||
        current.pages.some((page) =>
          page.items.some(({ id }) => id === auditLog.id),
        )
      ) {
        return current;
      }
      return {
        ...current,
        pages: current.pages.map((page, index) => ({
          ...page,
          count: page.count + 1,
          items: index === 0 ? [auditLog, ...page.items] : page.items,
        })),
      };
    },
  );
};

const waitForReconnect = (delay: number, signal: AbortSignal): Promise<void> =>
  new Promise((resolve) => {
    const timeout = window.setTimeout(resolve, delay);
    signal.addEventListener(
      "abort",
      () => {
        window.clearTimeout(timeout);
        resolve();
      },
      { once: true },
    );
  });

type UseAuditStreamOptions = {
  filters: AuditFilters;
  historyReady?: boolean;
  latestKnownId?: string | null;
  workspaceId: string | null;
};

export const useAuditStream = ({
  filters,
  historyReady = true,
  latestKnownId = null,
  workspaceId,
}: UseAuditStreamOptions) => {
  const accessToken = useAuthStore((state) => state.accessToken);
  const queryClient = useQueryClient();
  const filtersRef = useRef(filters);
  const latestKnownIdRef = useRef(latestKnownId);
  const [status, setStatus] = useState<AuditStreamStatus>("idle");
  const [latestAuditId, setLatestAuditId] = useState<string | null>(null);

  useEffect(() => {
    filtersRef.current = filters;
    latestKnownIdRef.current = latestKnownId;
  }, [filters, latestKnownId]);

  useEffect(() => {
    if (!workspaceId || !accessToken || !historyReady) {
      return;
    }

    const controller = new AbortController();
    let reconnectAttempt = 0;
    let lastEventId = latestKnownIdRef.current;

    const run = async () => {
      while (!controller.signal.aborted) {
        lastEventId ??= latestKnownIdRef.current;
        setStatus(reconnectAttempt === 0 ? "connecting" : "reconnecting");
        try {
          await connectAuditStream({
            accessToken,
            lastEventId,
            onAudit: (auditLog) => {
              lastEventId = auditLog.id;
              if (matchesAuditFilters(auditLog, filtersRef.current)) {
                prependRealtimeAudit(
                  queryClient,
                  workspaceId,
                  filtersRef.current,
                  auditLog,
                );
                setLatestAuditId(auditLog.id);
              }
            },
            onHeartbeat: () => {
              setStatus("live");
            },
            onOpen: () => {
              reconnectAttempt = 0;
              setStatus("live");
            },
            signal: controller.signal,
            workspaceId,
          });
        } catch (error: unknown) {
          if (error instanceof DOMException && error.name === "AbortError") {
            return;
          }
          if (error instanceof ApiError && error.status === 401) {
            useAuthStore.getState().logout();
            publishUnauthorized();
            setStatus("idle");
            return;
          }
          if (
            error instanceof ApiError &&
            (error.status === 403 || error.status === 404)
          ) {
            setStatus("idle");
            return;
          }
        }

        reconnectAttempt += 1;
        setStatus("reconnecting");
        await waitForReconnect(
          Math.min(1000 * 2 ** (reconnectAttempt - 1), MAX_RECONNECT_DELAY),
          controller.signal,
        );
      }
    };

    void run();
    return () => {
      controller.abort();
    };
  }, [accessToken, historyReady, queryClient, workspaceId]);

  return {
    latestAuditId,
    status: workspaceId && accessToken ? status : "idle",
  };
};
