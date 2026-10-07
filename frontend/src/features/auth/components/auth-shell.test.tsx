import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";

import { AuthShell } from "@/features/auth/components/auth-shell";

describe("AuthShell", () => {
  it("gives every account page an h1, a home link and a quiet brand panel", () => {
    render(
      <MemoryRouter>
        <AuthShell description="Retrouvez votre espace." title="Connexion">
          <p>Formulaire</p>
        </AuthShell>
      </MemoryRouter>,
    );

    expect(
      screen.getByRole("heading", { level: 1, name: "Connexion" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Retrouvez votre espace.")).toBeInTheDocument();
    expect(screen.getByText("Formulaire")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "TaskMiner — Accueil" }),
    ).toHaveAttribute("href", "/");
    expect(
      screen.getByRole("complementary", { name: "TaskMiner en bref" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("status")).toBeNull();
  });
});
