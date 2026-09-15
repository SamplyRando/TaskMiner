import { ApiError } from "@/api/client";
import { getPlanLimitCode } from "@/features/subscriptions/errors";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const getAIErrorCode = (error: ApiError): string | null => {
  if (!isRecord(error.details)) return null;
  const detail = error.details.detail;
  return isRecord(detail) && typeof detail.code === "string"
    ? detail.code
    : null;
};

export const getAIGenerationErrorMessage = (
  error: unknown,
): string | undefined => {
  if (!(error instanceof ApiError)) return undefined;
  if (
    error.status === 403 &&
    getAIErrorCode(error) === "email_verification_required"
  ) {
    return "Vérifiez votre adresse e-mail avant d’utiliser TaskMiner AI.";
  }
  if (error.status === 429) {
    return error.message === "AI monthly quota exceeded." ||
      getPlanLimitCode(error) === "ai_quota_reached"
      ? "Le quota mensuel TaskMiner AI de ce workspace est atteint."
      : "Trop de générations ont été demandées. Réessayez dans un instant.";
  }
  if (error.status === 502 || error.status === 503 || error.status === 504) {
    return "TaskMiner AI est temporairement indisponible. Réessayez dans quelques instants.";
  }
  return undefined;
};

export const getAIApplyErrorMessage = (error: unknown): string | undefined => {
  if (!(error instanceof ApiError)) return undefined;
  if (error.status === 404 && error.message === "Assignee not found.") {
    return "Un membre assigné n’est plus disponible dans ce workspace. Choisissez une autre assignation avant de réessayer.";
  }
  return undefined;
};
