import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";

import { PricingSection } from "@/components/marketing/pricing-section";

describe("PricingSection", () => {
  it("shows truthful monthly Free, Pro, and Enterprise offers", () => {
    render(
      <MemoryRouter>
        <PricingSection />
      </MemoryRouter>,
    );

    expect(screen.getAllByText("Free")).not.toHaveLength(0);
    expect(screen.getByText("12 € / month")).toBeInTheDocument();
    expect(
      screen.getByText("per workspace, billed monthly"),
    ).toBeInTheDocument();
    expect(screen.getByText("Contact")).toBeInTheDocument();
    expect(screen.getByText("3 members per workspace")).toBeInTheDocument();
    expect(screen.getByText("5 projects per workspace")).toBeInTheDocument();
    expect(screen.getByText("25 AI requests per month")).toBeInTheDocument();
    expect(screen.getByText("15 members per workspace")).toBeInTheDocument();
    expect(screen.getByText("50 projects per workspace")).toBeInTheDocument();
    expect(screen.getByText("500 AI requests per month")).toBeInTheDocument();
    expect(screen.queryByText(/coming soon/i)).toBeNull();
    expect(screen.queryByText(/annual/i)).toBeNull();
    expect(screen.getByRole("link", { name: "Start free" })).toHaveAttribute(
      "href",
      "/register",
    );
    expect(screen.getByRole("link", { name: "Start Pro" })).toHaveAttribute(
      "href",
      "/register",
    );
    expect(screen.getByRole("link", { name: "Contact us" })).toHaveAttribute(
      "href",
      expect.stringMatching(/^mailto:/),
    );
  });
});
