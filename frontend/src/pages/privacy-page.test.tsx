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
      screen.getByRole("link", { name: "Retour à TaskMiner" }),
    ).toHaveAttribute("href", "/");
    expect(
      screen.queryByRole("heading", { name: "Connexion" }),
    ).not.toBeInTheDocument();

    await waitFor(() => {
      expect(document.title).toBe("Politique de confidentialité · TaskMiner");
    });
  });
});
