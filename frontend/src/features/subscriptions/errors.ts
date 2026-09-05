import { ApiError } from "@/api/client";

export type PlanLimitCode =
  | "workspace_limit_reached"
  | "member_limit_reached"
  | "project_limit_reached"
  | "ai_quota_reached";

const planLimitCodes = new Set<PlanLimitCode>([
  "workspace_limit_reached",
  "member_limit_reached",
  "project_limit_reached",
  "ai_quota_reached",
]);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

export const getPlanLimitCode = (error: unknown): PlanLimitCode | null => {
  if (!(error instanceof ApiError) || !isRecord(error.details)) return null;
  const detail = error.details.detail;
  if (!isRecord(detail) || typeof detail.code !== "string") return null;
  return planLimitCodes.has(detail.code as PlanLimitCode)
    ? (detail.code as PlanLimitCode)
    : null;
};

export const getPlanLimitMessage = (error: unknown): string | undefined => {
  switch (getPlanLimitCode(error)) {
    case "workspace_limit_reached":
      return "Vous avez atteint le nombre de workspaces autorisé par votre plan.";
    case "member_limit_reached":
      return "Ce workspace a atteint le nombre de membres autorisé par son plan.";
    case "project_limit_reached":
      return "Ce workspace a atteint le nombre de projets autorisé par son plan.";
    case "ai_quota_reached":
      return "Le quota mensuel TaskMiner AI de ce workspace est atteint.";
    default:
      return undefined;
  }
};
