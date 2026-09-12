import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  confirmEmailVerification,
  loginUser,
  registerUser,
  requestEmailVerification,
} from "@/api/auth";
import { ApiError } from "@/api/client";
import { LoginPage } from "@/pages/login-page";
import { RegisterPage } from "@/pages/register-page";
import { VerifyEmailPage } from "@/pages/verify-email-page";
import { useAuthStore } from "@/store/auth-store";
import {
  createFakeAccessToken,
  fakeUser,
  resetAuthStore,
} from "@/test/auth-fixtures";

vi.mock("@/api/auth", () => ({
  confirmEmailVerification: vi.fn(),
  loginUser: vi.fn(),
  registerUser: vi.fn(),
  requestEmailVerification: vi.fn(),
}));

const mockedConfirmEmailVerification = vi.mocked(confirmEmailVerification);
const mockedLoginUser = vi.mocked(loginUser);
const mockedRegisterUser = vi.mocked(registerUser);
const mockedRequestEmailVerification = vi.mocked(requestEmailVerification);

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
    sessionStorage.clear();
    resetAuthStore();
    mockedConfirmEmailVerification.mockResolvedValue({
      already_completed: false,
      message: "Votre adresse e-mail est vérifiée.",
    });
    mockedRequestEmailVerification.mockResolvedValue({
      already_completed: false,
      message:
        "Si ce compte peut être vérifié, un e-mail vient de lui être envoyé.",
    });
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

  it("explains email verification and can resend without exposing backend details", async () => {
    mockedLoginUser.mockRejectedValue(
      new ApiError("Please verify your email address before signing in.", 403, {
        detail: {
          code: "email_not_verified",
          message: "Please verify your email address before signing in.",
        },
      }),
    );
    renderLoginPage();

    await fillLoginForm();

    expect(
      await screen.findByText("Adresse e-mail non vérifiée"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Vérifiez votre adresse avant de vous connecter à TaskMiner.",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Please verify/)).not.toBeInTheDocument();
    expect(useAuthStore.getState().accessToken).toBeNull();

    await userEvent.click(
      screen.getByRole("button", {
        name: "Renvoyer l’e-mail de vérification",
      }),
    );

    expect(mockedRequestEmailVerification).toHaveBeenCalledWith(
      "ada@example.com",
    );
    expect(await screen.findByRole("status")).toHaveTextContent(
      "Si ce compte peut être vérifié, un e-mail vient de lui être envoyé.",
    );
  });

  it("links to the public password reset request", () => {
    renderLoginPage();

    expect(
      screen.getByRole("link", { name: "Mot de passe oublié ?" }),
    ).toHaveAttribute("href", "/forgot-password");
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

  it("preserves an invitation through register, verification, login, and final handoff", async () => {
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
          <Route element={<VerifyEmailPage />} path="/verify-email" />
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
        "Votre compte a été créé. Consultez votre boîte de réception ou demandez un nouveau lien.",
      ),
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole("link", { name: "Continuer vers la connexion" }),
    );

    await fillLoginForm();

    expect(
      await screen.findByText("/app/invitations?token=NEW%2FUSER#accept"),
    ).toBeInTheDocument();
  });

  it("restores a remembered invitation after confirming an email link", async () => {
    sessionStorage.setItem(
      "taskminer-auth-destination",
      "/app/invitations?token=VERIFIED%2FUSER#accept",
    );
    mockedLoginUser.mockResolvedValue({
      access_token: createFakeAccessToken(),
      token_type: "bearer",
    });
    render(
      <MemoryRouter initialEntries={["/verify-email?token=email-token"]}>
        <Routes>
          <Route element={<VerifyEmailPage />} path="/verify-email" />
          <Route element={<LoginPage />} path="/login" />
          <Route element={<Destination />} path="/app/invitations" />
        </Routes>
      </MemoryRouter>,
    );
    const user = userEvent.setup();

    expect(
      await screen.findByText(
        "Votre adresse e-mail est vérifiée. Vous pouvez vous connecter.",
      ),
    ).toBeInTheDocument();
    await user.click(
      screen.getByRole("link", { name: "Continuer vers la connexion" }),
    );
    await fillLoginForm();

    expect(
      await screen.findByText("/app/invitations?token=VERIFIED%2FUSER#accept"),
    ).toBeInTheDocument();
    expect(sessionStorage.getItem("taskminer-auth-destination")).toBeNull();
  });
});
