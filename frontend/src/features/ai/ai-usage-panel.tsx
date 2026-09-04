import { AlertTriangle, Gauge, RefreshCw } from "lucide-react";

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
import type { AIWorkspaceUsage } from "@/types/ai";

type AIUsagePanelProps = {
  compact?: boolean;
  data: AIWorkspaceUsage | undefined;
  error: unknown;
  isPending: boolean;
  onRetry: () => void;
};

const formatPeriod = (value: string): string =>
  new Intl.DateTimeFormat("fr-FR", {
    month: "long",
    timeZone: "UTC",
    year: "numeric",
  }).format(new Date(value));

const formatCost = (value: number): string => {
  const absoluteValue = Math.abs(value);
  const fractionDigits =
    absoluteValue > 0 && absoluteValue < 0.0001
      ? 8
      : absoluteValue > 0 && absoluteValue < 0.01
        ? 6
        : 4;

  return new Intl.NumberFormat("fr-FR", {
    currency: "USD",
    maximumFractionDigits: fractionDigits,
    minimumFractionDigits:
      absoluteValue > 0 && absoluteValue < 0.01 ? fractionDigits : 2,
    style: "currency",
  }).format(value);
};

export function AIUsagePanel({
  compact = false,
  data,
  error,
  isPending,
  onRetry,
}: AIUsagePanelProps) {
  if (isPending) {
    return (
      <Card aria-busy="true" aria-label="Chargement de l’utilisation IA">
        <CardContent className={`space-y-3 ${compact ? "p-4" : "p-6"}`}>
          <div className="bg-muted h-5 w-40 animate-pulse rounded" />
          <div className="bg-muted h-2 w-full animate-pulse rounded" />
          <div className="bg-muted h-4 w-56 animate-pulse rounded" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive/30">
        <CardContent className="flex flex-col items-start gap-3 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <AlertTriangle
              aria-hidden="true"
              className="text-destructive mt-0.5 size-5 shrink-0"
            />
            <div>
              <p className="font-medium">Utilisation IA indisponible</p>
              <p className="text-muted-foreground mt-1 text-sm">
                {error instanceof ApiError
                  ? error.message
                  : "Impossible de charger les données d’utilisation."}
              </p>
            </div>
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

  const percentage = Math.min(
    100,
    Math.round((data.requests_used / data.request_limit) * 100),
  );
  const isReached = data.requests_remaining === 0;
  const isNearLimit = !isReached && percentage >= 80;

  return (
    <Card
      className={
        isReached
          ? "border-destructive/40"
          : isNearLimit
            ? "border-amber-500/40"
            : undefined
      }
    >
      <CardHeader
        className={`gap-3 sm:flex-row sm:items-start sm:justify-between sm:space-y-0 ${compact ? "p-4 pb-3" : ""}`}
      >
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <Gauge aria-hidden="true" className="text-primary size-4" />
            Utilisation IA
          </CardTitle>
          <CardDescription className="mt-1 capitalize">
            Période : {formatPeriod(data.period_start)}
          </CardDescription>
        </div>
        <span
          className={
            isReached
              ? "bg-destructive/10 text-destructive rounded-full px-3 py-1 text-xs font-medium"
              : isNearLimit
                ? "rounded-full bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-700 dark:text-amber-300"
                : "bg-primary/10 text-primary rounded-full px-3 py-1 text-xs font-medium"
          }
        >
          {isReached
            ? "Quota atteint"
            : isNearLimit
              ? "Quota bientôt atteint"
              : `${String(data.requests_remaining)} restantes`}
        </span>
      </CardHeader>
      <CardContent className={compact ? "space-y-4 px-4 pb-4" : "space-y-5"}>
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="font-medium">
              {data.requests_used} / {data.request_limit} requêtes
            </span>
            <span className="text-muted-foreground">{percentage}%</span>
          </div>
          <Progress
            aria-label="Quota mensuel TaskMiner AI utilisé"
            {...(isReached
              ? { indicatorClassName: "bg-destructive" }
              : isNearLimit
                ? { indicatorClassName: "bg-amber-500" }
                : {})}
            value={percentage}
          />
        </div>

        <dl className="grid gap-3 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-muted-foreground">Succès / erreurs</dt>
            <dd className="mt-1 font-medium">
              {data.successful_requests} / {data.failed_requests}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Coût estimé</dt>
            <dd className="mt-1 font-medium">
              {data.pricing_configured
                ? formatCost(data.estimated_cost_usd)
                : "Tarification non configurée"}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Latence moyenne</dt>
            <dd className="mt-1 font-medium">
              {data.average_latency_ms === null
                ? "—"
                : `${String(data.average_latency_ms)} ms`}
            </dd>
          </div>
        </dl>
      </CardContent>
    </Card>
  );
}
