import { ArrowUp, FileSearch } from "lucide-react";
import {
  memo,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { AuditItem } from "@/components/audit/audit-item";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import type { AuditLog } from "@/types/audit";

const ITEM_HEIGHT = 260;
const VIEWPORT_HEIGHT = 680;
const OVERSCAN = 4;

type AuditTimelineProps = {
  emptyAction?: ReactNode;
  hasNextPage?: boolean;
  isFetchingNextPage?: boolean;
  items: AuditLog[];
  latestAuditId?: string | null;
  onEndReached?: () => void;
  onView: (auditLog: AuditLog) => void;
};

export const AuditTimeline = memo(function AuditTimeline({
  emptyAction,
  hasNextPage = false,
  isFetchingNextPage = false,
  items,
  latestAuditId = null,
  onEndReached,
  onView,
}: AuditTimelineProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const previousFirstIdRef = useRef<string | undefined>(undefined);
  const [scrollTop, setScrollTop] = useState(0);
  const visibleRange = useMemo(() => {
    const start = Math.max(0, Math.floor(scrollTop / ITEM_HEIGHT) - OVERSCAN);
    const end = Math.min(
      items.length,
      Math.ceil((scrollTop + VIEWPORT_HEIGHT) / ITEM_HEIGHT) + OVERSCAN,
    );
    return { end, start };
  }, [items.length, scrollTop]);

  useLayoutEffect(() => {
    const previousFirstId = previousFirstIdRef.current;
    const viewport = viewportRef.current;
    if (previousFirstId && viewport && viewport.scrollTop > 0) {
      const previousItemIndex = items.findIndex(
        ({ id }) => id === previousFirstId,
      );
      if (previousItemIndex > 0) {
        viewport.scrollTop += previousItemIndex * ITEM_HEIGHT;
        setScrollTop(viewport.scrollTop);
      }
    }
    previousFirstIdRef.current = items[0]?.id;
  }, [items]);

  if (items.length === 0) {
    return (
      <div className="bg-card rounded-xl border">
        <EmptyState
          action={emptyAction}
          description="Les prochaines opérations auditables apparaîtront ici."
          icon={FileSearch}
          title="Journal d’audit vide"
        />
      </div>
    );
  }

  return (
    <div className="relative mx-auto max-w-5xl">
      <div
        aria-label="Journal d’audit virtualisé"
        className="max-h-[680px] overflow-y-auto overscroll-contain pr-2"
        onScroll={(event) => {
          const viewport = event.currentTarget;
          setScrollTop(viewport.scrollTop);
          if (
            hasNextPage &&
            !isFetchingNextPage &&
            viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight <
              ITEM_HEIGHT * 2
          ) {
            onEndReached?.();
          }
        }}
        ref={viewportRef}
        role="region"
        tabIndex={0}
      >
        <ol
          aria-label="Entrées du journal d’audit"
          className="relative"
          style={{ height: items.length * ITEM_HEIGHT }}
        >
          {items
            .slice(visibleRange.start, visibleRange.end)
            .map((auditLog, visibleIndex) => {
              const index = visibleRange.start + visibleIndex;
              return (
                <AuditItem
                  auditLog={auditLog}
                  isNew={auditLog.id === latestAuditId}
                  key={auditLog.id}
                  onView={onView}
                  position={index + 1}
                  style={{
                    height: ITEM_HEIGHT,
                    left: 0,
                    position: "absolute",
                    right: 0,
                    top: index * ITEM_HEIGHT,
                  }}
                  total={items.length}
                />
              );
            })}
        </ol>
        {isFetchingNextPage ? (
          <div className="flex justify-center py-4">
            <Spinner label="Chargement des audits suivants" />
          </div>
        ) : null}
      </div>
      {scrollTop > ITEM_HEIGHT * 2 ? (
        <Button
          className="absolute right-5 bottom-5 shadow-lg"
          onClick={() => {
            viewportRef.current?.scrollTo({ behavior: "smooth", top: 0 });
          }}
          size="sm"
          type="button"
          variant="secondary"
        >
          <ArrowUp aria-hidden="true" className="size-4" />
          Revenir en haut
        </Button>
      ) : null}
    </div>
  );
});
