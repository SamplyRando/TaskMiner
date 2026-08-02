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
      <CardHeader>
        <div className="flex items-center gap-2">
          {icon}
          <CardTitle className={destructive ? "text-destructive" : undefined}>
            {title}
          </CardTitle>
        </div>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}
