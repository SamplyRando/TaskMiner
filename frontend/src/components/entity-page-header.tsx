import type { ReactNode } from "react";

type EntityPageHeaderProps = {
  actions: ReactNode;
  description: string;
  title: string;
};

export function EntityPageHeader({
  actions,
  description,
  title,
}: EntityPageHeaderProps) {
  return (
    <div className="flex min-w-0 flex-col justify-between gap-4 sm:flex-row sm:items-center">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          {title}
        </h1>
        <p className="text-muted-foreground mt-1">{description}</p>
      </div>
      <div className="min-w-0 shrink-0">{actions}</div>
    </div>
  );
}
