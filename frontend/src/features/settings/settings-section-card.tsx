import type { PropsWithChildren, ReactNode } from "react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

type SettingsSectionCardProps = PropsWithChildren<{
  title: string;
  description: string;
  icon?: ReactNode;
  destructive?: boolean;
}>;

export function SettingsSectionCard({
  children,
  description,
  destructive = false,
  icon,
  title,
}: SettingsSectionCardProps) {
  return (
    <Card className={destructive ? "border-destructive-border" : undefined}>
      <CardHeader
        className={cn(
          "flex-row items-start gap-3 space-y-0 border-b p-4 sm:px-6 sm:py-5",
          destructive && "border-destructive-border",
        )}
      >
        {icon ? (
          <span
            className={cn(
              "flex size-9 shrink-0 items-center justify-center rounded-md border",
              destructive
                ? "border-destructive-border bg-destructive-subtle"
                : "bg-surface-sunken",
            )}
          >
            {icon}
          </span>
        ) : null}
        <div className="min-w-0 space-y-1">
          <CardTitle className={destructive ? "text-destructive" : undefined}>
            {title}
          </CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="p-4 sm:p-6">{children}</CardContent>
    </Card>
  );
}
