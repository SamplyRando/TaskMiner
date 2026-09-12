import { screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { confirmEmailVerification } from "@/api/auth";
import { AppRouter } from "@/routes/app-router";
import { resetAuthStore } from "@/test/auth-fixtures";
import { renderWithQuery } from "@/test/query-wrapper";

vi.mock("@/api/auth", () => ({
  confirmEmailVerification: vi.fn(),
  confirmPasswordReset: vi.fn(),
  loginUser: vi.fn(),
  registerUser: vi.fn(),
  requestEmailVerification: vi.fn(),
  requestPasswordReset: vi.fn(),
}));

describe("account lifecycle public routing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetAuthStore();
    vi.mocked(confirmEmailVerification).mockResolvedValue({
      already_completed: false,
      message: "Votre adresse e-mail est vérifiée.",
    });
  });

  it.each([
    ["/forgot-password", "Mot de passe oublié"],
    ["/reset-password?token=public-token", "Nouveau mot de passe"],
    ["/verify-email?token=public-token", "Vérifier votre adresse e-mail"],
  ])("renders %s without redirecting to login", async (route, heading) => {
    renderWithQuery(
      <MemoryRouter initialEntries={[route]}>
        <AppRouter />
      </MemoryRouter>,
    );

    expect(
      await screen.findByRole("heading", { level: 3, name: heading }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Connexion" }),
    ).not.toBeInTheDocument();
  });
});
