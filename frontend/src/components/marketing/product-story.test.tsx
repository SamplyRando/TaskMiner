import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";

import { AdaptationSection } from "@/components/marketing/adaptation-section";
import { ControlSection } from "@/components/marketing/control-section";
import { HeroSection } from "@/components/marketing/hero-section";
import { HeroVisual } from "@/components/marketing/hero-visual";
import { HowItWorks } from "@/components/marketing/how-it-works";

describe("TaskMiner marketing product story", () => {
  it("states the promise, the human review and the next step in the hero", () => {
    render(
      <MemoryRouter>
        <HeroSection />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Transformez vos idées en projets qui avancent.",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Vous relisez et validez le plan/),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Commencer gratuitement" }),
    ).toHaveAttribute("href", "/register");
    expect(
      screen.getByRole("link", { name: "Voir comment ça marche" }),
    ).toHaveAttribute("href", "#fonctionnement");
    expect(
      screen.getByText("Rien n’est créé sans votre validation"),
    ).toBeInTheDocument();
  });

  it("demonstrates the real product vocabulary in a decorative visual", () => {
    const { container } = render(<HeroVisual />);
    const visual = container.firstElementChild;

    expect(visual).toHaveAttribute("aria-hidden", "true");
    expect(visual?.textContent).toContain("Brief du projet");
    expect(visual?.textContent).toContain("Revue humaine");
    expect(visual?.textContent).toContain("Appliquer le plan");
    expect(visual?.textContent).toContain("Analyse du brief");
    expect(visual?.textContent).toContain("Kanban");
  });

  it("makes the review before application explicit", () => {
    render(<HowItWorks />);

    for (const title of [
      "Décrivez l’objectif",
      "TaskMiner AI propose un plan",
      "Vous gardez ce qui compte",
      "TaskMiner crée le projet",
    ]) {
      expect(
        screen.getByRole("heading", { level: 3, name: title }),
      ).toBeInTheDocument();
    }
    expect(
      screen.getByText("Un brouillon reste un brouillon."),
    ).toBeInTheDocument();
  });

  it("carries the human control principle", () => {
    render(<ControlSection />);

    expect(
      screen.getByRole("heading", {
        level: 2,
        name: "L’IA propose. Vous décidez.",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Un brouillon, jamais une action" }),
    ).toBeInTheDocument();
  });

  it("only promises changes to existing tasks when a project evolves", () => {
    const { container } = render(<AdaptationSection />);

    expect(
      screen.getByText(/propose des modifications de tâches existantes/),
    ).toBeInTheDocument();
    expect(container.textContent).toContain("Appliquer les modifications");
    expect(container.textContent).not.toMatch(
      /ajoute des tâches|supprime des tâches/i,
    );
  });
});
