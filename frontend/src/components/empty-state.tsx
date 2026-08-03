import { Inbox, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

type EmptyStateProps = {
  action?: ReactNode;
  description: string;
  icon?: LucideIcon;
  title: string;
};

export function EmptyState({
  action,
  description,
  icon: Icon = Inbox,
  title,
}: EmptyStateProps) {
  return (
    <div
      className="flex min-h-48 flex-col items-center justify-center px-6 py-8 text-center"
      role="status"
    >
      <div className="from-primary/15 via-primary/5 text-primary relative rounded-2xl border bg-linear-to-br to-transparent p-4 shadow-sm">
        <div className="bg-primary/10 absolute -inset-3 -z-10 rounded-full blur-xl" />
        <Icon aria-hidden="true" className="size-6" />
      </div>
      <p className="mt-4 text-base font-semibold">{title}</p>
      <p className="text-muted-foreground mt-1.5 max-w-sm text-sm leading-relaxed">
        {description}
      </p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
