import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AppRouter } from "@/routes/app-router";
import { useConsentStore } from "@/store/consent-store";
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

  describe("cookies section", () => {
    const scrollIntoView = vi.fn();

    beforeEach(() => {
      Element.prototype.scrollIntoView = scrollIntoView;
      useConsentStore.setState({ isPanelOpen: false });
    });

    afterEach(() => {
      scrollIntoView.mockReset();
      Reflect.deleteProperty(Element.prototype, "scrollIntoView");
    });

    it("describes the advertising tags and lets the visitor change their choice", async () => {
      const user = userEvent.setup();
      render(
        <MemoryRouter initialEntries={["/privacy#cookies"]}>
          <AppRouter />
        </MemoryRouter>,
      );

      const heading = await screen.findByRole("heading", {
        level: 2,
        name: "8. Cookies et traceurs",
      });
      expect(scrollIntoView).toHaveBeenCalledOnce();
      expect(scrollIntoView.mock.contexts[0]).toBe(heading.closest("section"));
      expect(
        screen.getByRole("heading", {
          level: 2,
          name: "13. Mise à jour de la politique",
        }),
      ).toBeInTheDocument();
      expect(
        screen.getByText(/Dernière mise à jour : 5 novembre 2026/),
      ).toBeInTheDocument();
      expect(
        screen.getByText(
          /cookies _fbp et _fbc, d’une durée de vie de 90 jours/,
        ),
      ).toBeInTheDocument();
      expect(
        screen.getByText(/pendant 6 mois, après quoi il vous est/),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("heading", {
          name: "LinkedIn Insight Tag, soumis à votre consentement",
        }),
      ).toBeInTheDocument();
      expect(
        screen.getByText(
          /la balise n’est jamais chargée sur les pages authentifiées/,
        ),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("link", {
          name: "politique de confidentialité",
        }),
      ).toHaveAttribute(
        "href",
        "https://www.linkedin.com/legal/privacy-policy",
      );
      expect(
        screen.getByRole("link", {
          name: "politique de confidentialité de Meta",
        }),
      ).toHaveAttribute("href", "https://www.facebook.com/privacy/policy/");
      expect(
        screen.getByRole("link", {
          name: "avenant de Meta relatif aux responsables du traitement",
        }),
      ).toHaveAttribute(
        "href",
        "https://www.facebook.com/legal/controller_addendum",
      );
      expect(
        screen.getByRole("button", { name: "Gestion des cookies" }),
      ).toBeInTheDocument();

      await user.click(
        screen.getByRole("button", { name: "Modifier mes choix" }),
      );

      expect(useConsentStore.getState().isPanelOpen).toBe(true);
    });
  });
});
