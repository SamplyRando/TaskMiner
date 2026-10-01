import type { PropsWithChildren, ReactNode } from "react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

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
    <Card className={destructive ? "border-destructive/50" : undefined}>
      <CardHeader className="p-4 sm:p-6">
        <div className="flex items-center gap-2">
          {icon}
          <CardTitle className={destructive ? "text-destructive" : undefined}>
            {title}
          </CardTitle>
        </div>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">{children}</CardContent>
    </Card>
  );
}
