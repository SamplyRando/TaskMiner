import { ApiError } from "@/api/client";

export const getAIGenerationErrorMessage = (
  error: unknown,
): string | undefined => {
  if (!(error instanceof ApiError)) return undefined;
  if (error.status === 429) {
    return error.message === "AI monthly quota exceeded."
      ? "Le quota mensuel TaskMiner AI de ce workspace est atteint."
      : "Trop de générations ont été demandées. Réessayez dans un instant.";
  }
  if (error.status === 502 || error.status === 503 || error.status === 504) {
    return "TaskMiner AI est temporairement indisponible. Réessayez dans quelques instants.";
  }
  return undefined;
};
