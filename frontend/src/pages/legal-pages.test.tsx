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
      screen.getByText(/TaskMiner recueille une demande expresse/),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        level: 2,
        name: "11. Formulaire type de rétractation",
      }),
    ).toBeInTheDocument();
    const withdrawalForm = screen.getByLabelText(
      "Modèle de formulaire de rétractation",
    );
    expect(withdrawalForm).toHaveTextContent("Iskander Hadji");
    expect(withdrawalForm).toHaveTextContent(
      "15 rue François de Vaux de Foletier",
    );
    expect(withdrawalForm).toHaveTextContent("17000 La Rochelle");
    expect(withdrawalForm).toHaveTextContent("France");
    expect(withdrawalForm).toHaveTextContent("hello@taskminer.app");
    expect(withdrawalForm).toHaveTextContent("Date de souscription");
    expect(withdrawalForm).toHaveTextContent("Nom du consommateur");
    expect(withdrawalForm).toHaveTextContent("Adresse du consommateur");
    expect(withdrawalForm).toHaveTextContent("Date de la demande");
    expect(withdrawalForm).toHaveTextContent(
      /uniquement en cas d’envoi du formulaire sur papier/,
    );
    expect(
      screen.getByText(/le montant payé est remboursé intégralement/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /déduction faite uniquement de la part strictement proportionnelle au service déjà fourni/,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Aucun frais fixe ni aucune pénalité/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/remboursement applicable est traité manuellement/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/L’utilisation de ce formulaire n’est pas obligatoire/),
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
      screen.getByRole("heading", {
        level: 2,
        name: "16. Médiation de la consommation",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Cette procédure concerne uniquement les consommateurs/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/d’abord adresser une réclamation écrite à TaskMiner/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/saisir gratuitement le médiateur/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /Centre de la Médiation de la Consommation des Conciliateurs de Justice \(CM2C\)/,
      ),
    ).toBeInTheDocument();
    const mediatorDetails = screen.getByLabelText("Coordonnées du CM2C");
    expect(mediatorDetails).toHaveTextContent("49 rue de Ponthieu");
    expect(mediatorDetails).toHaveTextContent("75008 Paris");
    expect(screen.getByRole("link", { name: "www.cm2c.net" })).toHaveAttribute(
      "href",
      "https://www.cm2c.net/",
    );
    expect(
      screen.getByRole("link", { name: "les modalités de saisine du CM2C" }),
    ).toHaveAttribute("href", "https://www.cm2c.net/comment-nous-saisir.php");
    expect(
      screen.queryByText(
        /nom, adresse, site internet et coordonnées du médiateur/,
      ),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(
        /confirmer les modalités de remboursement et fournir le formulaire type/,
      ),
    ).not.toBeInTheDocument();
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
