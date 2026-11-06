import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { registerUser } from "@/api/auth";
import { ApiError } from "@/api/client";
import { linkedInInsightTag } from "@/lib/linkedin-insight";
import { metaPixel } from "@/lib/meta-pixel";
import { RegisterPage } from "@/pages/register-page";
import { fakeUser, resetAuthStore } from "@/test/auth-fixtures";

vi.mock("@/api/auth", () => ({
  loginUser: vi.fn(),
  registerUser: vi.fn(),
}));

vi.mock("@/lib/meta-pixel", () => ({
  metaPixel: { track: vi.fn(), trackPageView: vi.fn(), update: vi.fn() },
}));
vi.mock("@/lib/linkedin-insight", () => ({
  linkedInInsightTag: {
    trackRegistrationConversion: vi.fn(),
    update: vi.fn(),
  },
}));

const mockedRegisterUser = vi.mocked(registerUser);
const mockedTrack = vi.mocked(metaPixel.track);
const mockedLinkedInRegistration = vi.mocked(
  linkedInInsightTag.trackRegistrationConversion,
);

const fillRegisterForm = async (): Promise<void> => {
  const user = userEvent.setup();
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
};

const VerificationDestination = () => {
  const location = useLocation();
  const state = location.state as { email?: string; from?: string } | null;
  return (
    <div>{`Vérification — ${state?.email ?? "missing"} — ${state?.from ?? "missing"}`}</div>
  );
};

const renderRegisterPage = (from?: string) =>
  render(
    <MemoryRouter
      initialEntries={[
        {
          pathname: "/register",
          state: from ? { from } : undefined,
        },
      ]}
    >
      <Routes>
        <Route element={<RegisterPage />} path="/register" />
        <Route element={<VerificationDestination />} path="/verify-email" />
      </Routes>
    </MemoryRouter>,
  );

describe("RegisterPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    resetAuthStore();
    mockedLinkedInRegistration.mockResolvedValue(true);
  });

  it("registers an account and opens the verification instructions", async () => {
    mockedRegisterUser.mockResolvedValue(fakeUser);
    renderRegisterPage();

    await fillRegisterForm();

    expect(
      await screen.findByText("Vérification — ada@example.com — /app"),
    ).toBeInTheDocument();
    expect(mockedRegisterUser).toHaveBeenCalledWith({
      email: "ada@example.com",
      fullName: "Ada Lovelace",
      password: "Strong-password-123!",
    });
  });

  it("reports the registration only once the backend confirmed it", async () => {
    let confirmRegistration: ((user: typeof fakeUser) => void) | undefined;
    mockedRegisterUser.mockReturnValue(
      new Promise((resolve) => {
        confirmRegistration = resolve;
      }),
    );
    renderRegisterPage();

    await fillRegisterForm();
    expect(mockedTrack).not.toHaveBeenCalled();
    expect(mockedLinkedInRegistration).not.toHaveBeenCalled();
    confirmRegistration?.(fakeUser);

    expect(
      await screen.findByText("Vérification — ada@example.com — /app"),
    ).toBeInTheDocument();
    expect(mockedTrack.mock.calls).toEqual([["CompleteRegistration"]]);
    expect(mockedLinkedInRegistration).toHaveBeenCalledOnce();
    expect(mockedLinkedInRegistration).toHaveBeenCalledWith(fakeUser.id);
  });

  it("shows non-blocking links to the terms and privacy policy", () => {
    renderRegisterPage();

    expect(
      screen.getByRole("link", { name: "Conditions d’utilisation" }),
    ).toHaveAttribute("href", "/terms");
    expect(
      screen.getByRole("link", { name: "Politique de confidentialité" }),
    ).toHaveAttribute("href", "/privacy");
    expect(
      screen.getByRole("button", { name: "Créer mon compte" }),
    ).toBeEnabled();
  });

  it("displays a registration error returned by the backend", async () => {
    mockedRegisterUser.mockRejectedValue(
      new ApiError("An account with this email already exists.", 409),
    );
    renderRegisterPage();

    await fillRegisterForm();

    expect(
      await screen.findByText("An account with this email already exists."),
    ).toBeInTheDocument();
    expect(mockedTrack).not.toHaveBeenCalled();
    expect(mockedLinkedInRegistration).not.toHaveBeenCalled();
  });

  it("does not report a conversion for a simple registration-page visit", () => {
    renderRegisterPage();

    expect(mockedLinkedInRegistration).not.toHaveBeenCalled();
  });

  it("keeps registration successful if LinkedIn tracking fails", async () => {
    mockedRegisterUser.mockResolvedValue(fakeUser);
    mockedLinkedInRegistration.mockRejectedValue(
      new Error("LinkedIn unavailable"),
    );
    renderRegisterPage();

    await fillRegisterForm();

    expect(
      await screen.findByText("Vérification — ada@example.com — /app"),
    ).toBeInTheDocument();
  });

  it("preserves the invitation destination through registration", async () => {
    mockedRegisterUser.mockResolvedValue(fakeUser);
    renderRegisterPage("/app/invitations?token=ABC#accept");

    await fillRegisterForm();

    expect(
      await screen.findByText(
        "Vérification — ada@example.com — /app/invitations?token=ABC#accept",
      ),
    ).toBeInTheDocument();
  });
});
