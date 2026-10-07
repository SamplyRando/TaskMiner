import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";

import { planCatalog, VAT_NOTICE } from "@/features/subscriptions/plan-catalog";
import { TermsPage } from "@/pages/terms-page";
import {
  freeSubscriptionFixture,
  proSubscriptionFixture,
} from "@/test/subscription-fixtures";

describe("planCatalog", () => {
  it("mirrors the plan limits returned by the API", () => {
    expect(planCatalog.free.limits).toEqual(freeSubscriptionFixture.limits);
    expect(planCatalog.pro.limits).toEqual(proSubscriptionFixture.limits);
  });

  it("publishes the same price, limits and VAT notice as the terms of service", () => {
    render(
      <MemoryRouter>
        <TermsPage />
      </MemoryRouter>,
    );
    const { free, pro } = planCatalog;

    expect(
      screen.getByText(
        new RegExp(
          `tarif de ${String(pro.monthlyPriceEur)} € / mois / workspace`,
        ),
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        new RegExp(
          `${String(pro.limits.members)} membres, ${String(pro.limits.projects)} projets et ${String(pro.limits.ai_requests_per_month)} requêtes`,
        ),
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        new RegExp(
          `${String(free.limits.members)} membres, ${String(free.limits.projects)} projets et ${String(free.limits.ai_requests_per_month)} requêtes`,
        ),
      ),
    ).toBeInTheDocument();
    expect(screen.getByText(VAT_NOTICE)).toBeInTheDocument();
  });
});
