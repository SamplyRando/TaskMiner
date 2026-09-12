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
    expect(
      screen.getByText(/12 € par mois et par workspace/),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Connexion" }),
    ).not.toBeInTheDocument();

    await waitFor(() => {
      expect(document.title).toBe("Conditions d’utilisation · TaskMiner");
    });
  });
});
