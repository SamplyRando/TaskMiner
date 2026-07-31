import { AlertCircle } from "lucide-react";

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
    <div className="border-destructive/30 bg-destructive/5 flex min-h-56 flex-col items-center justify-center rounded-xl border px-6 text-center">
      <AlertCircle aria-hidden="true" className="text-destructive size-8" />
      <p className="mt-3 font-medium">Une erreur est survenue</p>
      <p className="text-muted-foreground mt-1 max-w-lg text-sm">{message}</p>
      <Button
        className="mt-4"
        onClick={onRetry}
        type="button"
        variant="outline"
      >
        Réessayer
      </Button>
    </div>
  );
}
