import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";

import { PricingSection } from "@/components/marketing/pricing-section";

const renderPricing = () =>
  render(
    <MemoryRouter>
      <PricingSection />
    </MemoryRouter>,
  );

describe("PricingSection", () => {
  it("shows only the real Free and Pro offers with their exact limits", () => {
    renderPricing();

    const free = screen.getByRole("article", { name: "Free" });
    const pro = screen.getByRole("article", { name: "Pro" });

    expect(within(free).getByText("0 €")).toBeInTheDocument();
    expect(
      within(free).getByText("3 membres par workspace"),
    ).toBeInTheDocument();
    expect(
      within(free).getByText("5 projets par workspace"),
    ).toBeInTheDocument();
    expect(
      within(free).getByText("25 requêtes TaskMiner AI par mois"),
    ).toBeInTheDocument();

    expect(within(pro).getByText("12 €")).toBeInTheDocument();
    expect(
      within(pro).getByText("par mois et par workspace"),
    ).toBeInTheDocument();
    expect(
      within(pro).getByText("15 membres par workspace"),
    ).toBeInTheDocument();
    expect(
      within(pro).getByText("50 projets par workspace"),
    ).toBeInTheDocument();
    expect(
      within(pro).getByText("500 requêtes TaskMiner AI par mois"),
    ).toBeInTheDocument();

    expect(screen.getAllByRole("article")).toHaveLength(2);
    expect(
      screen.getByText(/TVA non applicable, art\. 293 B du CGI\./),
    ).toBeInTheDocument();
  });

  it("avoids invented offers, discounts and pressure tactics", () => {
    const { container } = renderPricing();
    const text = container.textContent;

    expect(text).not.toMatch(
      /enterprise|entreprise|most popular|le plus populaire|annuel|annual|remise|réduction|offre limitée|coming soon|contact/i,
    );
    expect(container.querySelector("s, del")).toBeNull();
  });

  it("sends both offers to the real registration route and explains the upgrade", () => {
    renderPricing();

    expect(
      screen.getByRole("link", { name: "Commencer gratuitement" }),
    ).toHaveAttribute("href", "/register");
    expect(
      screen.getByRole("link", { name: "Créer mon espace" }),
    ).toHaveAttribute("href", "/register");
    expect(
      screen.getByText(
        "Le propriétaire du workspace passe ensuite à Pro depuis l’application, quand il le souhaite.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Voir les conditions commerciales" }),
    ).toHaveAttribute("href", "/terms");
  });
});
