import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { loginUser, registerUser } from "@/api/auth";
import { ApiError } from "@/api/client";
import { LoginPage } from "@/pages/login-page";
import { RegisterPage } from "@/pages/register-page";
import { useAuthStore } from "@/store/auth-store";
import {
  createFakeAccessToken,
  fakeUser,
  resetAuthStore,
} from "@/test/auth-fixtures";

vi.mock("@/api/auth", () => ({
  loginUser: vi.fn(),
  registerUser: vi.fn(),
}));

const mockedLoginUser = vi.mocked(loginUser);
const mockedRegisterUser = vi.mocked(registerUser);

const fillLoginForm = async (): Promise<void> => {
  const user = userEvent.setup();
  await user.type(
    screen.getByRole("textbox", { name: "Adresse e-mail" }),
    "ada@example.com",
  );
  await user.type(screen.getByLabelText("Mot de passe"), "password123");
  await user.click(screen.getByRole("button", { name: "Se connecter" }));
};

const Destination = () => {
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from;
  return (
    <div>{`${location.pathname}${location.search}${location.hash}${from ? ` → ${from}` : ""}`}</div>
  );
};

const renderLoginPage = (from?: string) =>
  render(
    <MemoryRouter
      initialEntries={[
        {
          pathname: "/login",
          state: from ? { from } : undefined,
        },
      ]}
    >
      <Routes>
        <Route element={<LoginPage />} path="/login" />
        <Route element={<div>Espace authentifié</div>} path="/app" />
        <Route element={<Destination />} path="/app/invitations" />
        <Route element={<Destination />} path="/register" />
      </Routes>
    </MemoryRouter>,
  );

describe("LoginPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetAuthStore();
  });

  it("logs in, persists the token and redirects to the application", async () => {
    const accessToken = createFakeAccessToken();
    mockedLoginUser.mockResolvedValue({
      access_token: accessToken,
      token_type: "bearer",
    });
    renderLoginPage();

    await fillLoginForm();

    expect(await screen.findByText("Espace authentifié")).toBeInTheDocument();
    expect(useAuthStore.getState()).toMatchObject({
      accessToken,
      tokenType: "bearer",
      isAuthenticated: true,
    });
    expect(localStorage.getItem("taskminer-auth")).toContain(accessToken);
  });

  it("displays invalid credentials returned by the backend", async () => {
    mockedLoginUser.mockRejectedValue(
      new ApiError("Invalid email or password.", 401),
    );
    renderLoginPage();

    await fillLoginForm();

    expect(
      await screen.findByText("Invalid email or password."),
    ).toBeInTheDocument();
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });

  it("restores the invitation query and hash after login", async () => {
    mockedLoginUser.mockResolvedValue({
      access_token: createFakeAccessToken(),
      token_type: "bearer",
    });
    renderLoginPage("/app/invitations?token=ABC%2F123#accept");

    await fillLoginForm();

    expect(
      await screen.findByText("/app/invitations?token=ABC%2F123#accept"),
    ).toBeInTheDocument();
  });

  it("preserves the invitation destination when switching to registration", async () => {
    renderLoginPage("/app/invitations?token=ABC#accept");

    await userEvent.click(screen.getByRole("link", { name: "S’inscrire" }));

    expect(
      screen.getByText("/register → /app/invitations?token=ABC#accept"),
    ).toBeInTheDocument();
  });

  it("preserves an invitation through register, login, and final handoff", async () => {
    const accessToken = createFakeAccessToken();
    mockedRegisterUser.mockResolvedValue(fakeUser);
    mockedLoginUser.mockResolvedValue({
      access_token: accessToken,
      token_type: "bearer",
    });
    render(
      <MemoryRouter
        initialEntries={[
          {
            pathname: "/login",
            state: { from: "/app/invitations?token=NEW%2FUSER#accept" },
          },
        ]}
      >
        <Routes>
          <Route element={<LoginPage />} path="/login" />
          <Route element={<RegisterPage />} path="/register" />
          <Route element={<Destination />} path="/app/invitations" />
        </Routes>
      </MemoryRouter>,
    );
    const user = userEvent.setup();

    await user.click(screen.getByRole("link", { name: "S’inscrire" }));
    await user.type(screen.getByLabelText("Nom complet"), "Ada Lovelace");
    await user.type(
      screen.getByRole("textbox", { name: "Adresse e-mail" }),
      "ada@example.com",
    );
    await user.type(
      screen.getByLabelText("Mot de passe"),
      "Strong-password-123!",
    );
    await user.type(
      screen.getByLabelText("Confirmer le mot de passe"),
      "Strong-password-123!",
    );
    await user.click(screen.getByRole("button", { name: "Créer mon compte" }));
    expect(
      await screen.findByText(
        "Votre compte a été créé. Vous pouvez maintenant vous connecter.",
      ),
    ).toBeInTheDocument();

    await fillLoginForm();

    expect(
      await screen.findByText("/app/invitations?token=NEW%2FUSER#accept"),
    ).toBeInTheDocument();
  });
});
