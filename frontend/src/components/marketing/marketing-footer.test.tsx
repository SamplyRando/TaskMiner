import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";

import { MarketingFooter } from "@/components/marketing/marketing-footer";

describe("MarketingFooter", () => {
  it("links to every public legal document", () => {
    render(
      <MemoryRouter>
        <MarketingFooter />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole("link", { name: "Confidentialité" }),
    ).toHaveAttribute("href", "/privacy");
    expect(
      screen.getByRole("link", { name: "Mentions légales" }),
    ).toHaveAttribute("href", "/legal");
    expect(
      screen.getByRole("link", { name: "Conditions d’utilisation" }),
    ).toHaveAttribute("href", "/terms");
  });

  it("keeps a real contact and the consumer mediation, without fake offers", () => {
    render(
      <MemoryRouter>
        <MarketingFooter />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole("link", { name: "hello@taskminer.app" }),
    ).toHaveAttribute("href", "mailto:hello@taskminer.app");
    expect(
      screen.getByRole("link", { name: "Médiation (CGU, art. 16)" }),
    ).toHaveAttribute("href", "/terms");
    expect(
      screen.getByRole("link", { name: "Créer un compte" }),
    ).toHaveAttribute("href", "/register");
    expect(screen.queryByText(/demo|démo|enterprise/i)).toBeNull();
    expect(
      screen.getByText(`© ${String(new Date().getFullYear())} TaskMiner`),
    ).toBeInTheDocument();
  });
});
