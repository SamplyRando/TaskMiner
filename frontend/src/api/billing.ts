import { ApiError, apiClient } from "@/api/client";
import type {
  BillingCheckoutRedirect,
  BillingPortalRedirect,
} from "@/types/billing";

export const createBillingCheckout = async (request: {
  immediateServiceRequested: boolean;
  workspaceId: string;
}): Promise<BillingCheckoutRedirect> => {
  const response = await apiClient.post<BillingCheckoutRedirect>(
    `/workspaces/${request.workspaceId}/billing/checkout`,
    { immediate_service_requested: request.immediateServiceRequested },
  );
  return response.data;
};

export const createBillingPortal = async (
  workspaceId: string,
): Promise<BillingPortalRedirect> => {
  const response = await apiClient.post<BillingPortalRedirect>(
    `/workspaces/${workspaceId}/billing/portal`,
  );
  return response.data;
};

export const redirectToBillingUrl = (
  url: string,
  navigate: (target: string) => void = (target) => {
    window.location.assign(target);
  },
): void => {
  const target = new URL(url);
  const isStripeHost =
    target.hostname === "stripe.com" || target.hostname.endsWith(".stripe.com");
  if (target.protocol !== "https:" || !isStripeHost) {
    throw new ApiError("La redirection de paiement est invalide.");
  }
  navigate(target.toString());
};
