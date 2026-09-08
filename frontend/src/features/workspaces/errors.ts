import { ApiError } from "@/api/client";

const SUBSCRIPTION_ATTACHED_CODE = "workspace_subscription_attached";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

export const getWorkspaceDeletionErrorMessage = (
  error: unknown,
): string | undefined => {
  if (!(error instanceof ApiError) || !isRecord(error.details)) {
    return undefined;
  }
  const detail = error.details.detail;
  if (!isRecord(detail) || detail.code !== SUBSCRIPTION_ATTACHED_CODE) {
    return undefined;
  }
  return "Ce workspace possède encore un abonnement actif. Annulez d’abord l’abonnement et attendez sa date de fin avant de supprimer le workspace.";
};
