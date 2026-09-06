import { useMutation } from "@tanstack/react-query";

import { createBillingCheckout, createBillingPortal } from "@/api/billing";

export const useBillingCheckout = () =>
  useMutation({
    mutationFn: createBillingCheckout,
    retry: false,
  });

export const useBillingPortal = () =>
  useMutation({
    mutationFn: createBillingPortal,
    retry: false,
  });
