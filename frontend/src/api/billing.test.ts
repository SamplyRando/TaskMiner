import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  createBillingCheckout,
  createBillingPortal,
  redirectToBillingUrl,
} from "@/api/billing";
import { ApiError, apiClient } from "@/api/client";
import { workspaceId } from "@/test/resource-fixtures";

describe("billing API", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("creates checkout without sending a client-selected price", async () => {
    const post = vi.spyOn(apiClient, "post").mockResolvedValue({
      data: {
        checkout_url: "https://checkout.stripe.com/c/pay/test",
      },
    });

    await createBillingCheckout(workspaceId);

    expect(post).toHaveBeenCalledWith(
      `/workspaces/${workspaceId}/billing/checkout`,
    );
  });

  it("creates a portal session through the authenticated backend", async () => {
    const post = vi.spyOn(apiClient, "post").mockResolvedValue({
      data: {
        portal_url: "https://billing.stripe.com/p/test",
      },
    });

    await createBillingPortal(workspaceId);

    expect(post).toHaveBeenCalledWith(
      `/workspaces/${workspaceId}/billing/portal`,
    );
  });

  it("redirects only to a Stripe HTTPS host", () => {
    const navigate = vi.fn();

    redirectToBillingUrl("https://checkout.stripe.com/c/pay/test", navigate);

    expect(navigate).toHaveBeenCalledWith(
      "https://checkout.stripe.com/c/pay/test",
    );
    redirectToBillingUrl("https://billing.stripe.com/p/test", navigate);
    expect(navigate).toHaveBeenLastCalledWith(
      "https://billing.stripe.com/p/test",
    );
    expect(() => {
      redirectToBillingUrl("https://attacker.example/checkout", navigate);
    }).toThrow(ApiError);
  });
});
