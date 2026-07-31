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
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
        <p className="text-muted-foreground mt-1">{description}</p>
      </div>
      {actions}
    </div>
  );
}
