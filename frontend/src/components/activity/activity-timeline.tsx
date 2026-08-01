import { Activity, ArrowUp } from "lucide-react";
import { memo, useEffect, useMemo, useRef, useState } from "react";

import { ActivityItem } from "@/components/activity/activity-item";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import type { ActivityItem as ActivityRecord } from "@/types/activity";

const ITEM_HEIGHT = 168;
const VIEWPORT_HEIGHT = 640;
const OVERSCAN = 4;

type ActivityTimelineProps = {
  hasNextPage?: boolean;
  isFetchingNextPage?: boolean;
  items: ActivityRecord[];
  latestActivityId?: string | null;
  onEndReached?: () => void;
};

export const ActivityTimeline = memo(function ActivityTimeline({
  hasNextPage = false,
  isFetchingNextPage = false,
  items,
  latestActivityId = null,
  onEndReached,
}: ActivityTimelineProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [, setClockTick] = useState(0);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setClockTick((current) => current + 1);
    }, 30_000);
    return () => {
      window.clearInterval(interval);
    };
  }, []);

  const visibleRange = useMemo(() => {
    const start = Math.max(0, Math.floor(scrollTop / ITEM_HEIGHT) - OVERSCAN);
    const end = Math.min(
      items.length,
      Math.ceil((scrollTop + VIEWPORT_HEIGHT) / ITEM_HEIGHT) + OVERSCAN,
    );
    return { end, start };
  }, [items.length, scrollTop]);

  if (items.length === 0) {
    return (
      <div className="bg-card rounded-xl border">
        <EmptyState
          description="Les prochains événements de ce workspace apparaîtront ici."
          icon={Activity}
          title="Aucune activité"
        />
      </div>
    );
  }

  return (
    <div className="relative mx-auto max-w-4xl">
      <div
        aria-label="Flux d’activités virtualisé"
        className="max-h-[640px] overflow-y-auto overscroll-contain pr-2"
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
          aria-label="Historique des activités"
          className="relative"
          style={{ height: items.length * ITEM_HEIGHT }}
        >
          {items
            .slice(visibleRange.start, visibleRange.end)
            .map((activity, visibleIndex) => {
              const index = visibleRange.start + visibleIndex;
              return (
                <ActivityItem
                  activity={activity}
                  isLast={index === items.length - 1}
                  isNew={activity.id === latestActivityId}
                  key={activity.id}
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
            <Spinner label="Chargement des activités suivantes" />
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
