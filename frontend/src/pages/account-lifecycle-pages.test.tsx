import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  confirmEmailVerification,
  confirmPasswordReset,
  requestEmailVerification,
  requestPasswordReset,
} from "@/api/auth";
import { ApiError } from "@/api/client";
import { ForgotPasswordPage } from "@/pages/forgot-password-page";
import { ResetPasswordPage } from "@/pages/reset-password-page";
import { VerifyEmailPage } from "@/pages/verify-email-page";

vi.mock("@/api/auth", () => ({
  confirmEmailVerification: vi.fn(),
  confirmPasswordReset: vi.fn(),
  requestEmailVerification: vi.fn(),
  requestPasswordReset: vi.fn(),
}));

const mockedConfirmEmailVerification = vi.mocked(confirmEmailVerification);
const mockedConfirmPasswordReset = vi.mocked(confirmPasswordReset);
const mockedRequestEmailVerification = vi.mocked(requestEmailVerification);
const mockedRequestPasswordReset = vi.mocked(requestPasswordReset);

const accountActionResponse = {
  already_completed: false,
  message:
    "Si un compte actif correspond à cette adresse, un e-mail vient d’être envoyé.",
};

describe("account lifecycle public pages", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    mockedConfirmEmailVerification.mockResolvedValue({
      already_completed: false,
      message: "Votre adresse e-mail est vérifiée.",
    });
    mockedConfirmPasswordReset.mockResolvedValue({
      already_completed: false,
      message: "Votre mot de passe a été réinitialisé.",
    });
    mockedRequestEmailVerification.mockResolvedValue(accountActionResponse);
    mockedRequestPasswordReset.mockResolvedValue(accountActionResponse);
  });

  it("requests a password reset and shows the generic response", async () => {
    render(
      <MemoryRouter>
        <ForgotPasswordPage />
      </MemoryRouter>,
    );
    const user = userEvent.setup();

    await user.type(
      screen.getByRole("textbox", { name: "Adresse e-mail" }),
      "ada@example.com",
    );
    await user.click(screen.getByRole("button", { name: "Envoyer le lien" }));

    expect(mockedRequestPasswordReset).toHaveBeenCalledWith("ada@example.com");
    expect(await screen.findByRole("status")).toHaveTextContent(
      accountActionResponse.message,
    );
  });

  it("prevents a double password-reset request while pending", async () => {
    let resolveRequest!: (value: typeof accountActionResponse) => void;
    mockedRequestPasswordReset.mockReturnValue(
      new Promise((resolve) => {
        resolveRequest = resolve;
      }),
    );
    render(
      <MemoryRouter>
        <ForgotPasswordPage />
      </MemoryRouter>,
    );
    const user = userEvent.setup();

    await user.type(
      screen.getByRole("textbox", { name: "Adresse e-mail" }),
      "ada@example.com",
    );
    const submit = screen.getByRole("button", { name: "Envoyer le lien" });
    await user.dblClick(submit);

    expect(mockedRequestPasswordReset).toHaveBeenCalledTimes(1);
    expect(submit).toBeDisabled();
    resolveRequest(accountActionResponse);
    await screen.findByRole("status");
  });

  it("resets a password with the token from the public URL", async () => {
    render(
      <MemoryRouter
        initialEntries={["/reset-password?token=opaque-token-value"]}
      >
        <ResetPasswordPage />
      </MemoryRouter>,
    );
    const user = userEvent.setup();

    await user.type(
      screen.getByLabelText("Nouveau mot de passe"),
      "Strong-new-password-123!",
    );
    await user.type(
      screen.getByLabelText("Confirmer le mot de passe"),
      "Strong-new-password-123!",
    );
    await user.click(
      screen.getByRole("button", { name: "Réinitialiser le mot de passe" }),
    );

    expect(mockedConfirmPasswordReset).toHaveBeenCalledWith({
      confirmation: "Strong-new-password-123!",
      newPassword: "Strong-new-password-123!",
      token: "opaque-token-value",
    });
    expect(await screen.findByRole("status")).toHaveTextContent(
      "Votre mot de passe a été réinitialisé.",
    );
  });

  it("shows an invalid or expired reset-token error safely", async () => {
    mockedConfirmPasswordReset.mockRejectedValue(
      new ApiError("Ce lien de réinitialisation a expiré.", 400),
    );
    render(
      <MemoryRouter initialEntries={["/reset-password?token=expired-token"]}>
        <ResetPasswordPage />
      </MemoryRouter>,
    );
    const user = userEvent.setup();

    await user.type(
      screen.getByLabelText("Nouveau mot de passe"),
      "Strong-new-password-123!",
    );
    await user.type(
      screen.getByLabelText("Confirmer le mot de passe"),
      "Strong-new-password-123!",
    );
    await user.click(
      screen.getByRole("button", { name: "Réinitialiser le mot de passe" }),
    );

    expect(
      await screen.findByText("Ce lien de réinitialisation a expiré."),
    ).toBeInTheDocument();
  });

  it("confirms an email token once and shows success", async () => {
    render(
      <MemoryRouter initialEntries={["/verify-email?token=verify-token"]}>
        <VerifyEmailPage />
      </MemoryRouter>,
    );

    expect(
      await screen.findByText(
        "Votre adresse e-mail est vérifiée. Vous pouvez vous connecter.",
      ),
    ).toBeInTheDocument();
    expect(mockedConfirmEmailVerification).toHaveBeenCalledTimes(1);
    expect(mockedConfirmEmailVerification).toHaveBeenCalledWith("verify-token");
  });

  it("resends verification without allowing a double submit", async () => {
    let resolveRequest!: (value: typeof accountActionResponse) => void;
    mockedRequestEmailVerification.mockReturnValue(
      new Promise((resolve) => {
        resolveRequest = resolve;
      }),
    );
    render(
      <MemoryRouter
        initialEntries={[
          {
            pathname: "/verify-email",
            state: {
              email: "ada@example.com",
              registrationSuccess: true,
            },
          },
        ]}
      >
        <VerifyEmailPage />
      </MemoryRouter>,
    );
    const user = userEvent.setup();

    expect(screen.getByDisplayValue("ada@example.com")).toBeInTheDocument();
    const submit = screen.getByRole("button", { name: "Renvoyer l’e-mail" });
    await user.dblClick(submit);

    expect(mockedRequestEmailVerification).toHaveBeenCalledTimes(1);
    expect(mockedRequestEmailVerification).toHaveBeenCalledWith(
      "ada@example.com",
    );
    expect(submit).toBeDisabled();
    resolveRequest(accountActionResponse);
    await waitFor(() => {
      expect(submit).not.toBeInTheDocument();
    });
    expect(screen.getByRole("status")).toHaveTextContent(
      accountActionResponse.message,
    );
  });
});
