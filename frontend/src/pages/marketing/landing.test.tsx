import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";

import { marketingAnchorIds } from "@/components/marketing/use-active-marketing-section";
import { LANDING_TITLE, LandingPage } from "@/pages/marketing/landing";

const renderLanding = () =>
  render(
    <MemoryRouter>
      <LandingPage />
    </MemoryRouter>,
  );

describe("LandingPage", () => {
  it("tells the product story in one outline with a single h1", () => {
    renderLanding();

    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    const sectionTitles = screen
      .getAllByRole("heading", { level: 2 })
      .map((heading) => heading.textContent.replace(/\s+/g, " ").trim());

    expect(sectionTitles).toEqual([
      "Un projet commence rarement avec un plan clair.",
      "Donnez le contexte. TaskMiner structure le travail.",
      "Le plan validé devient votre espace de travail.",
      "Le projet change ? Le plan suit.",
      "Où en est vraiment le travail ?",
      "Toute l’équipe sur le même plan.",
      "L’IA propose. Vous décidez.",
      "Des tarifs simples, par workspace.",
      "Ce qu’il faut savoir avant de commencer.",
      "Votre prochain projet peut commencer par un plan clair.",
    ]);
    expect(document.title).toBe(LANDING_TITLE);
    expect(screen.getByRole("main")).toHaveAttribute("id", "marketing-content");
  });

  it("only links to anchors that exist on the page", () => {
    const { container } = renderLanding();

    const hashes = new Set(
      Array.from(container.querySelectorAll<HTMLAnchorElement>('a[href^="#"]'))
        .map((link) => link.getAttribute("href") ?? "")
        .filter(Boolean),
    );
    expect(hashes.size).toBeGreaterThan(0);
    hashes.forEach((hash) => {
      const id = hash.slice(1);
      expect(document.getElementById(id)).not.toBeNull();
      // Handled by the anchor engine (header offset, focus, reduced motion).
      expect(marketingAnchorIds).toContain(id);
    });
  });

  it("relies on the product, not on invented social proof", () => {
    const { container } = renderLanding();

    expect(container.textContent).not.toMatch(
      /trusted by|ils nous font confiance|témoignage|clients satisfaits|enterprise|most popular|le plus populaire|book a demo|réserver une démo|\+\s?\d+\s?%/i,
    );
    expect(container.querySelector("img")).toBeNull();
  });
});
