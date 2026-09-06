import type { WorkspaceSubscription } from "@/types/subscription";

export const freeSubscriptionFixture: WorkspaceSubscription = {
  cancel_at_period_end: false,
  scheduled_cancellation_at: null,
  billing_enabled: true,
  billing_portal_available: false,
  current_period_end: null,
  current_period_start: null,
  limits: {
    ai_requests_per_month: 25,
    members: 3,
    projects: 5,
  },
  plan: "free",
  status: "active",
  usage: {
    ai_requests_this_month: 7,
    members: 2,
    projects: 4,
  },
};

export const proSubscriptionFixture: WorkspaceSubscription = {
  ...freeSubscriptionFixture,
  billing_portal_available: true,
  limits: {
    ai_requests_per_month: 500,
    members: 15,
    projects: 50,
  },
  plan: "pro",
};
