import { Inbox, type LucideIcon } from "lucide-react";

type EmptyStateProps = {
  description: string;
  icon?: LucideIcon;
  title: string;
};

export function EmptyState({
  description,
  icon: Icon = Inbox,
  title,
}: EmptyStateProps) {
  return (
    <div className="flex min-h-40 flex-col items-center justify-center px-6 text-center">
      <div className="bg-muted text-muted-foreground rounded-full p-3">
        <Icon aria-hidden="true" className="size-5" />
      </div>
      <p className="mt-3 font-medium">{title}</p>
      <p className="text-muted-foreground mt-1 max-w-sm text-sm">
        {description}
      </p>
    </div>
  );
}
