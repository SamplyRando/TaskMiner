import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it } from "vitest";

import { AppRouter } from "@/routes/app-router";
import { resetAuthStore } from "@/test/auth-fixtures";

describe("PrivacyPage public route", () => {
  beforeEach(() => {
    resetAuthStore();
  });

  it("renders /privacy without authentication or a login redirect", async () => {
    render(
      <MemoryRouter initialEntries={["/privacy"]}>
        <AppRouter />
      </MemoryRouter>,
    );

    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: "Politique de confidentialité",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        level: 2,
        name: "1. Responsable du traitement",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/responsable du traitement est Iskander Hadji/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /15 rue François de Vaux de Foletier, 17000 La Rochelle/,
      ),
    ).toBeInTheDocument();
    const privacyContactLinks = screen.getAllByRole("link", {
      name: "hello@taskminer.app",
    });
    expect(privacyContactLinks).not.toHaveLength(0);
    for (const link of privacyContactLinks) {
      expect(link).toHaveAttribute(
        "href",
        "mailto:hello@taskminer.app?subject=TaskMiner%20-%20Données%20personnelles",
      );
    }
    expect(
      screen.getByText(/régions d’hébergement et garanties de transfert/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/durées de conservation par catégorie de données/),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Retour à TaskMiner" }),
    ).toHaveAttribute("href", "/");
    expect(
      screen.getByRole("link", { name: "Mentions légales" }),
    ).toHaveAttribute("href", "/legal");
    expect(
      screen.getByRole("link", { name: "Conditions d’utilisation" }),
    ).toHaveAttribute("href", "/terms");
    expect(
      screen.queryByRole("heading", { name: "Connexion" }),
    ).not.toBeInTheDocument();

    await waitFor(() => {
      expect(document.title).toBe("Politique de confidentialité · TaskMiner");
    });
  });
});
