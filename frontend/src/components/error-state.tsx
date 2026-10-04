import { AlertCircle, RefreshCw } from "lucide-react";

import { ApiError } from "@/api/client";
import { Button } from "@/components/ui/button";

type ErrorStateProps = {
  error: unknown;
  onRetry: () => void;
};

export function ErrorState({ error, onRetry }: ErrorStateProps) {
  const message =
    error instanceof ApiError
      ? error.message
      : "Impossible de charger les données.";

  return (
    <div
      aria-live="polite"
      className="border-destructive-border bg-destructive-subtle/50 rounded-card flex min-h-56 flex-col items-center justify-center border px-6 py-8 text-center"
      role="alert"
    >
      <span className="bg-surface text-destructive border-destructive-border flex size-10 items-center justify-center rounded-lg border">
        <AlertCircle aria-hidden="true" className="size-5" />
      </span>
      <p className="mt-3 font-semibold tracking-tight">
        Une erreur est survenue
      </p>
      <p className="text-muted-foreground mt-1 max-w-lg text-sm">{message}</p>
      <Button
        className="mt-4"
        onClick={onRetry}
        type="button"
        variant="outline"
      >
        <RefreshCw aria-hidden="true" className="size-4" />
        Réessayer
      </Button>
    </div>
  );
}
