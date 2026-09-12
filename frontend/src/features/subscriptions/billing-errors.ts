import { ApiError } from "@/api/client";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

export const getBillingErrorMessage = (error: unknown): string | null => {
  if (!error) return null;
  if (!(error instanceof ApiError)) {
    return "La facturation est temporairement indisponible. Réessayez plus tard.";
  }
  if (error.status === 403) {
    return "Seul le propriétaire du workspace peut gérer l’abonnement.";
  }
  if (error.status === 409) {
    return "L’état actuel de l’abonnement ne permet pas cette action.";
  }
  if (error.status === 422 && isRecord(error.details)) {
    const detail = error.details.detail;
    if (
      isRecord(detail) &&
      detail.code === "billing_immediate_service_consent_required"
    ) {
      return "Vous devez confirmer votre demande d’accès immédiat à TaskMiner Pro.";
    }
  }
  if (error.status === 503) {
    return "La facturation n’est pas encore configurée.";
  }
  return "La facturation est temporairement indisponible. Réessayez plus tard.";
};
