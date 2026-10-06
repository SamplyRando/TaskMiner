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
            ? "border-warning-border"
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
              ? "border-destructive-border bg-destructive-subtle text-destructive w-fit shrink-0 rounded-sm border px-2 py-0.5 text-xs font-medium whitespace-nowrap"
              : isNearLimit
                ? "border-warning-border bg-warning-subtle text-warning w-fit shrink-0 rounded-sm border px-2 py-0.5 text-xs font-medium whitespace-nowrap"
                : "border-brand-border bg-brand-subtle text-brand w-fit shrink-0 rounded-sm border px-2 py-0.5 text-xs font-medium whitespace-nowrap"
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
                ? { indicatorClassName: "bg-warning" }
                : {})}
            value={percentage}
          />
        </div>

        <dl className="bg-border grid gap-px overflow-hidden rounded-md border text-sm sm:grid-cols-3">
          <div className="bg-surface-sunken px-3 py-2.5">
            <dt className="text-muted-foreground text-xs">Succès / erreurs</dt>
            <dd className="mt-1 font-medium tabular-nums">
              {data.successful_requests} / {data.failed_requests}
            </dd>
          </div>
          <div className="bg-surface-sunken px-3 py-2.5">
            <dt className="text-muted-foreground text-xs">Coût estimé</dt>
            <dd className="mt-1 font-medium tabular-nums">
              {data.pricing_configured
                ? formatCost(data.estimated_cost_usd)
                : "Tarification non configurée"}
            </dd>
          </div>
          <div className="bg-surface-sunken px-3 py-2.5">
            <dt className="text-muted-foreground text-xs">Latence moyenne</dt>
            <dd className="mt-1 font-medium tabular-nums">
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
