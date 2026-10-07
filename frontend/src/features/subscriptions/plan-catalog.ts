import type { PlanCode, WorkspacePlanLimits } from "@/types/subscription";

/**
 * Public description of the plans shown on the marketing pages.
 * Limits mirror the backend source of truth (backend/app/subscriptions/
 * plans.py, PLAN_LIMITS); a test keeps them aligned with the subscription
 * fixtures. The Pro price is the one stated in the terms of service (§9):
 * 12 € per month and per workspace, VAT not applicable (art. 293 B du CGI).
 */
export type PlanCatalogEntry = {
  code: PlanCode;
  limits: WorkspacePlanLimits;
  monthlyPriceEur: number;
  name: string;
  ownedWorkspaces: number;
};

export const planCatalog: Record<PlanCode, PlanCatalogEntry> = {
  free: {
    code: "free",
    limits: { ai_requests_per_month: 25, members: 3, projects: 5 },
    monthlyPriceEur: 0,
    name: "Free",
    ownedWorkspaces: 1,
  },
  pro: {
    code: "pro",
    limits: { ai_requests_per_month: 500, members: 15, projects: 50 },
    monthlyPriceEur: 12,
    name: "Pro",
    ownedWorkspaces: 5,
  },
};

export const VAT_NOTICE = "TVA non applicable, art. 293 B du CGI.";
