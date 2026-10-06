import { Inbox, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

type EmptyStateProps = {
  action?: ReactNode;
  description: string;
  icon?: LucideIcon;
  title: string;
  /** compact: inline placeholder for dense containers (Kanban columns). */
  variant?: "default" | "compact";
};

/**
 * Facette mark of empty states: the icon rests on a plate whose top-left
 * corner is cut at 45°, with the detached Améthyste shard — the logo's
 * geometry at container scale. Decorative only.
 */
function EmptyStateMark({ icon: Icon }: { icon: LucideIcon }) {
  return (
    <div aria-hidden="true" className="relative size-12">
      <svg
        className="absolute inset-0 size-full"
        fill="none"
        viewBox="0 0 48 48"
      >
        <path
          className="fill-surface-sunken stroke-border-strong"
          d="M17.5 2.5H42.5A3 3 0 0 1 45.5 5.5V42.5A3 3 0 0 1 42.5 45.5H5.5A3 3 0 0 1 2.5 42.5V17.5Z"
          strokeLinejoin="round"
        />
        <path className="fill-brand" d="M1.5 1.5H12.5L1.5 12.5Z" />
      </svg>
      <Icon className="text-muted-foreground absolute top-[calc(50%+1px)] left-[calc(50%+1px)] size-5 -translate-x-1/2 -translate-y-1/2" />
    </div>
  );
}

export function EmptyState({
  action,
  description,
  icon = Inbox,
  title,
  variant = "default",
}: EmptyStateProps) {
  if (variant === "compact") {
    return (
      <div
        className="rounded-card flex flex-col items-center justify-center gap-1 border border-dashed px-4 py-8 text-center"
        role="status"
      >
        <p className="text-sm font-medium">{title}</p>
        <p className="text-muted-foreground max-w-56 text-xs leading-relaxed">
          {description}
        </p>
        {action ? <div className="mt-3">{action}</div> : null}
      </div>
    );
  }

  return (
    <div
      className="flex min-h-48 flex-col items-center justify-center px-6 py-10 text-center"
      role="status"
    >
      <EmptyStateMark icon={icon} />
      <p className="mt-4 text-base font-semibold tracking-tight">{title}</p>
      <p className="text-muted-foreground mt-1.5 max-w-sm text-sm leading-relaxed">
        {description}
      </p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
