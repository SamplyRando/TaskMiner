import { CreditCard, Crown, RefreshCw } from "lucide-react";

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
import { getBillingErrorMessage } from "@/features/subscriptions/billing-errors";

type WorkspacePlanCardProps = {
  data: WorkspaceSubscription | undefined;
  error: unknown;
  isPending: boolean;
  onRetry: () => void;
  onManageBilling: () => void;
  onUpgrade: () => void;
  actionError: unknown;
  actionPending: boolean;
  canManageBilling: boolean;
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

const formatBillingDate = (value: string): string =>
  new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" }).format(
    new Date(value),
  );

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
  actionError,
  actionPending,
  canManageBilling,
  data,
  error,
  isPending,
  onManageBilling,
  onRetry,
  onUpgrade,
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

  const billingError = getBillingErrorMessage(actionError);
  const isPro = data.plan === "pro";
  const shouldManageBilling = isPro || data.billing_portal_available;
  const renewalDate = data.current_period_end
    ? formatBillingDate(data.current_period_end)
    : null;
  const scheduledCancellationDate = data.scheduled_cancellation_at
    ? formatBillingDate(data.scheduled_cancellation_at)
    : null;
  const billingPeriodMessage = scheduledCancellationDate
    ? `Annulation prévue le ${scheduledCancellationDate}`
    : renewalDate
      ? `Prochain renouvellement le ${renewalDate}`
      : null;

  return (
    <Card>
      <CardHeader className="gap-4 sm:flex-row sm:items-start sm:justify-between sm:space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Crown aria-hidden="true" className="text-primary size-5" />
            Plan {isPro ? "Pro" : "Free"}
          </CardTitle>
          <CardDescription className="mt-1">
            {workspaceName} · {statusLabels[data.status]}
          </CardDescription>
        </div>
        {canManageBilling ? (
          <Button
            disabled={!data.billing_enabled}
            isLoading={actionPending}
            loadingLabel={
              shouldManageBilling
                ? "Ouverture du portail"
                : "Ouverture de Stripe"
            }
            onClick={shouldManageBilling ? onManageBilling : onUpgrade}
            type="button"
            variant={shouldManageBilling ? "outline" : "default"}
          >
            <CreditCard aria-hidden="true" className="size-4" />
            {shouldManageBilling ? "Gérer l’abonnement" : "Passer à Pro"}
          </Button>
        ) : (
          <p className="text-muted-foreground text-sm">
            Facturation gérée par le propriétaire
          </p>
        )}
      </CardHeader>
      {isPro && billingPeriodMessage ? (
        <p className="text-muted-foreground -mt-3 px-6 text-sm">
          {billingPeriodMessage}
        </p>
      ) : null}
      {!data.billing_enabled && canManageBilling ? (
        <p className="text-muted-foreground -mt-3 px-6 text-sm">
          La facturation en ligne est momentanément indisponible.
        </p>
      ) : null}
      {billingError ? (
        <p className="text-destructive -mt-3 px-6 text-sm" role="alert">
          {billingError}
        </p>
      ) : null}
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
