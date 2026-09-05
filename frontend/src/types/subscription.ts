export type PlanCode = "free" | "pro";

export type SubscriptionStatus =
  "active" | "inactive" | "canceled" | "past_due" | "trialing" | "incomplete";

export type WorkspacePlanLimits = {
  members: number;
  projects: number;
  ai_requests_per_month: number;
};

export type WorkspacePlanUsage = {
  members: number;
  projects: number;
  ai_requests_this_month: number;
};

export type WorkspaceSubscription = {
  plan: PlanCode;
  status: SubscriptionStatus;
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  limits: WorkspacePlanLimits;
  usage: WorkspacePlanUsage;
};
