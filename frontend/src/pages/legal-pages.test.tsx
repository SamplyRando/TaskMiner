import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it } from "vitest";

import { AppRouter } from "@/routes/app-router";
import { resetAuthStore } from "@/test/auth-fixtures";

describe("public legal routes", () => {
  beforeEach(() => {
    resetAuthStore();
  });

  it("renders /legal without authentication or a login redirect", async () => {
    render(
      <MemoryRouter initialEntries={["/legal"]}>
        <AppRouter />
      </MemoryRouter>,
    );

    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: "Mentions légales",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        level: 2,
        name: "1. Éditeur du service",
      }),
    ).toBeInTheDocument();
    expect(screen.getAllByText("Iskander Hadji")).not.toHaveLength(0);
    expect(screen.getByText("988 573 580")).toBeInTheDocument();
    expect(screen.getByText("988 573 580 00012")).toBeInTheDocument();
    expect(
      screen.getByText("988 573 580 R.C.S. La Rochelle"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Entrepreneur individuel — micro-entreprise"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Inscrit au Registre national des entreprises"),
    ).toBeInTheDocument();
    expect(screen.getByText("47.91B")).toBeInTheDocument();
    expect(
      screen.getAllByText(
        /15 rue François de Vaux de Foletier, 17000 La Rochelle/,
      ),
    ).not.toHaveLength(0);
    expect(
      screen.getByRole("link", { name: "hello@taskminer.app" }),
    ).toHaveAttribute("href", "mailto:hello@taskminer.app");
    expect(
      screen.getByRole("link", { name: "06 14 71 30 20" }),
    ).toHaveAttribute("href", "tel:+33614713020");
    expect(
      screen.queryByText(/numéro de téléphone professionnel/),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText(/raisons sociales et coordonnées postales/),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Connexion" }),
    ).not.toBeInTheDocument();

    await waitFor(() => {
      expect(document.title).toBe("Mentions légales · TaskMiner");
    });
  });

  it("renders /terms without authentication or a login redirect", async () => {
    render(
      <MemoryRouter initialEntries={["/terms"]}>
        <AppRouter />
      </MemoryRouter>,
    );

    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: "Conditions d’utilisation",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        level: 2,
        name: "9. Offres Free et Pro — conditions commerciales",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText(/12 € \/ mois \/ workspace/)).toBeInTheDocument();
    expect(
      screen.getByText("TVA non applicable, art. 293 B du CGI."),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/particuliers comme aux professionnels/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/délai légal de rétractation de 14/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/ne s’appliquent pas aux clients professionnels/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/aucune renonciation automatique/),
    ).toBeInTheDocument();
    expect(
      screen
        .getAllByRole("link", { name: "hello@taskminer.app" })
        .some(
          (link) =>
            link.getAttribute("href") ===
            "mailto:hello@taskminer.app?subject=TaskMiner%20-%20R%C3%A9tractation",
        ),
    ).toBe(true);
    expect(
      screen.getByText(/recueil d’une demande expresse du consommateur/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /« Gérer l’abonnement » ouvre le Stripe Customer Portal/,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /résiliation prend effet à la fin de la période déjà payée/,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /Après réclamation écrite préalable auprès de TaskMiner restée sans solution/,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "[À COMPLÉTER AVANT LANCEMENT B2C : nom, adresse, site internet et coordonnées du médiateur de la consommation référencé auquel l’entreprise aura adhéré]",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Iskander Hadji/)).not.toBeInTheDocument();
    expect(
      screen.getByText(/droit applicable, juridiction compétente/),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/numéro de TVA intracommunautaire/i),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Connexion" }),
    ).not.toBeInTheDocument();

    await waitFor(() => {
      expect(document.title).toBe("Conditions d’utilisation · TaskMiner");
    });
  });
});
