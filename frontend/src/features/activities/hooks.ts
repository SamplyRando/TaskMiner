import {
  type InfiniteData,
  type QueryClient,
  keepPreviousData,
  useInfiniteQuery,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";

import { ApiError } from "@/api/client";
import {
  connectActivityStream,
  listWorkspaceActivities,
} from "@/api/activities";
import { matchesActivityFilters } from "@/features/activities/filters";
import { publishUnauthorized } from "@/lib/auth-events";
import { useAuthStore } from "@/store/auth-store";
import type {
  ActivityFeed,
  ActivityFilters,
  ActivityItem,
  ActivityListParams,
  ActivityStreamStatus,
} from "@/types/activity";

const ACTIVITY_PAGE_SIZE = 20;
const MAX_RECONNECT_DELAY = 10_000;

export const activityKeys = {
  all: ["activities"] as const,
  workspace: (workspaceId: string) =>
    [...activityKeys.all, workspaceId] as const,
  list: (workspaceId: string, params: ActivityListParams) =>
    [...activityKeys.workspace(workspaceId), params] as const,
  feeds: () => [...activityKeys.all, "infinite"] as const,
  feed: (workspaceId: string, filters: ActivityFilters) =>
    [...activityKeys.feeds(), workspaceId, filters] as const,
};

export const useWorkspaceActivities = (
  workspaceId: string | null,
  params: ActivityListParams,
) =>
  useQuery({
    enabled: workspaceId !== null,
    queryFn: () => {
      if (workspaceId === null) {
        throw new Error("A workspace is required to load activities.");
      }
      return listWorkspaceActivities(workspaceId, params);
    },
    queryKey: activityKeys.list(workspaceId ?? "none", params),
    staleTime: 30_000,
  });

export const useInfiniteWorkspaceActivities = (
  workspaceId: string | null,
  filters: ActivityFilters,
) =>
  useInfiniteQuery<
    ActivityFeed,
    Error,
    InfiniteData<ActivityFeed, number>,
    ReturnType<typeof activityKeys.feed>,
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
        throw new Error("A workspace is required to load activities.");
      }
      return listWorkspaceActivities(workspaceId, {
        ...filters,
        limit: ACTIVITY_PAGE_SIZE,
        offset: pageParam,
      });
    },
    queryKey: activityKeys.feed(workspaceId ?? "none", filters),
    staleTime: 30_000,
  });

export const prependRealtimeActivity = (
  queryClient: QueryClient,
  workspaceId: string,
  filters: ActivityFilters,
  activity: ActivityItem,
): void => {
  queryClient.setQueryData<InfiniteData<ActivityFeed, number>>(
    activityKeys.feed(workspaceId, filters),
    (current) => {
      if (
        !current ||
        current.pages.some((page) =>
          page.items.some(({ id }) => id === activity.id),
        )
      ) {
        return current;
      }
      return {
        ...current,
        pages: current.pages.map((page, index) => ({
          ...page,
          count: page.count + 1,
          items: index === 0 ? [activity, ...page.items] : page.items,
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

type UseActivityStreamOptions = {
  filters: ActivityFilters;
  workspaceId: string | null;
  workspaceName: string;
};

export const useActivityStream = ({
  filters,
  workspaceId,
  workspaceName,
}: UseActivityStreamOptions) => {
  const accessToken = useAuthStore((state) => state.accessToken);
  const queryClient = useQueryClient();
  const filtersRef = useRef(filters);
  const workspaceNameRef = useRef(workspaceName);
  const [status, setStatus] = useState<ActivityStreamStatus>("idle");
  const [latestActivityId, setLatestActivityId] = useState<string | null>(null);

  useEffect(() => {
    filtersRef.current = filters;
    workspaceNameRef.current = workspaceName;
  }, [filters, workspaceName]);

  useEffect(() => {
    if (!workspaceId || !accessToken) {
      return;
    }

    const controller = new AbortController();
    let reconnectAttempt = 0;
    let lastEventId: string | null = null;

    const run = async () => {
      while (!controller.signal.aborted) {
        setStatus(reconnectAttempt === 0 ? "connecting" : "reconnecting");
        try {
          await connectActivityStream({
            accessToken,
            lastEventId,
            onActivity: (activity) => {
              lastEventId = activity.id;
              if (
                matchesActivityFilters(
                  activity,
                  filtersRef.current,
                  workspaceNameRef.current,
                )
              ) {
                prependRealtimeActivity(
                  queryClient,
                  workspaceId,
                  filtersRef.current,
                  activity,
                );
                setLatestActivityId(activity.id);
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
  }, [accessToken, queryClient, workspaceId]);

  return {
    latestActivityId,
    status: workspaceId && accessToken ? status : "idle",
  };
};
