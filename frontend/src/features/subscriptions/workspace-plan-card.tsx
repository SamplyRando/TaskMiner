import { Crown, RefreshCw } from "lucide-react";

import { ApiError } from "@/api/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { WorkspaceSubscription } from "@/types/subscription";

type WorkspacePlanCardProps = {
  data: WorkspaceSubscription | undefined;
  error: unknown;
  isPending: boolean;
  onRetry: () => void;
  workspaceName: string;
};

const statusLabels: Record<WorkspaceSubscription["status"], string> = {
  active: "Actif",
  canceled: "Annulé",
  incomplete: "Incomplet",
  inactive: "Inactif",
  past_due: "Paiement en retard",
  trialing: "Période d’essai",
};

type UsageItemProps = {
  label: string;
  limit: number;
  used: number;
};

function UsageItem({ label, limit, used }: UsageItemProps) {
  const percentage = Math.min(100, Math.round((used / limit) * 100));
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">
          {used} / {limit}
        </span>
      </div>
      <Progress aria-label={`${label} utilisés`} value={percentage} />
    </div>
  );
}

export function WorkspacePlanCard({
  data,
  error,
  isPending,
  onRetry,
  workspaceName,
}: WorkspacePlanCardProps) {
  if (isPending) {
    return (
      <Card aria-busy="true" aria-label="Chargement du plan du workspace">
        <CardContent className="grid gap-4 p-6 sm:grid-cols-3">
          <div className="bg-muted h-16 animate-pulse rounded-lg" />
          <div className="bg-muted h-16 animate-pulse rounded-lg" />
          <div className="bg-muted h-16 animate-pulse rounded-lg" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive/30">
        <CardContent className="flex flex-col gap-3 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-medium">Plan du workspace indisponible</p>
            <p className="text-muted-foreground mt-1 text-sm">
              {error instanceof ApiError
                ? error.message
                : "Impossible de charger les limites du plan."}
            </p>
          </div>
          <Button onClick={onRetry} type="button" variant="outline">
            <RefreshCw aria-hidden="true" className="size-4" />
            Réessayer
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  return (
    <Card>
      <CardHeader className="gap-4 sm:flex-row sm:items-start sm:justify-between sm:space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Crown aria-hidden="true" className="text-primary size-5" />
            Plan {data.plan === "pro" ? "Pro" : "Free"}
          </CardTitle>
          <CardDescription className="mt-1">
            {workspaceName} · {statusLabels[data.status]}
          </CardDescription>
        </div>
        <Button disabled type="button" variant="outline">
          Passer à Pro · Bientôt disponible
        </Button>
      </CardHeader>
      <CardContent className="grid gap-5 sm:grid-cols-3">
        <UsageItem
          label="Membres"
          limit={data.limits.members}
          used={data.usage.members}
        />
        <UsageItem
          label="Projets"
          limit={data.limits.projects}
          used={data.usage.projects}
        />
        <UsageItem
          label="Requêtes IA ce mois"
          limit={data.limits.ai_requests_per_month}
          used={data.usage.ai_requests_this_month}
        />
      </CardContent>
    </Card>
  );
}
