import type { ReactNode } from "react";

import { BrandLogo } from "@/components/brand-logo";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type AccountActionCardProps = {
  children: ReactNode;
  description: string;
  title: string;
};

export function AccountActionCard({
  children,
  description,
  title,
}: AccountActionCardProps) {
  return (
    <main className="from-background via-muted/40 to-primary/5 flex min-h-screen items-center justify-center bg-linear-to-br px-4 py-12">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center">
          <div className="mb-3 flex justify-center">
            <BrandLogo to="/" />
          </div>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">{children}</CardContent>
      </Card>
    </main>
  );
}
