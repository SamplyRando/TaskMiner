import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  createGoogleAuthAttempt,
  createGoogleLinkAttempt,
  linkGoogleAccount,
} from "@/api/auth";
import { GoogleAuthButton } from "@/features/auth/components/google-auth-button";
import {
  loadGoogleIdentity,
  type GoogleCredentialResponse,
  type GoogleIdentityApi,
} from "@/lib/google-identity";
import { useAuthStore } from "@/store/auth-store";
import {
  createFakeAccessToken,
  fakeUser,
  resetAuthStore,
} from "@/test/auth-fixtures";

vi.mock("@/api/auth", () => ({
  authenticateWithGoogle: vi.fn(),
  createGoogleAuthAttempt: vi.fn(),
  createGoogleLinkAttempt: vi.fn(),
  linkGoogleAccount: vi.fn(),
  loginUser: vi.fn(),
  registerUser: vi.fn(),
}));
vi.mock("@/lib/google-identity", () => ({
  loadGoogleIdentity: vi.fn(),
}));

const attempt = {
  attempt_id: "9cf29862-cb34-4fd4-9b3c-476dfc6d78ce",
  nonce: "one-time-server-nonce-with-enough-entropy",
  expires_at: "2026-11-08T12:10:00Z",
};
const authResult = {
  access_token: createFakeAccessToken(),
  token_type: "bearer" as const,
  user: fakeUser,
  is_new_user: true,
};

const mockedAuthAttempt = vi.mocked(createGoogleAuthAttempt);
const mockedLinkAttempt = vi.mocked(createGoogleLinkAttempt);
const mockedLink = vi.mocked(linkGoogleAccount);
const mockedLoadGoogle = vi.mocked(loadGoogleIdentity);
let credentialCallback:
  ((response: GoogleCredentialResponse) => void) | undefined;
type InitializeConfiguration = Parameters<
  GoogleIdentityApi["accounts"]["id"]["initialize"]
>[0];
type RenderButtonParent = Parameters<
  GoogleIdentityApi["accounts"]["id"]["renderButton"]
>[0];

describe("GoogleAuthButton", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("VITE_GOOGLE_CLIENT_ID", "public-web-client-id");
    resetAuthStore();
    mockedAuthAttempt.mockResolvedValue(attempt);
    mockedLinkAttempt.mockResolvedValue(attempt);
    mockedLoadGoogle.mockResolvedValue({
      accounts: {
        id: {
          disableAutoSelect: vi.fn(),
          initialize: vi.fn((configuration: InitializeConfiguration) => {
            credentialCallback = configuration.callback;
          }),
          renderButton: vi.fn((parent: RenderButtonParent) => {
            const button = document.createElement("button");
            button.textContent = "Continuer avec Google";
            parent.append(button);
          }),
        },
      },
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    credentialCallback = undefined;
  });

  it("exchanges one credential and prevents duplicate callback submission", async () => {
    let resolveLogin: ((value: typeof authResult) => void) | undefined;
    const loginWithGoogle = vi.fn(
      () =>
        new Promise<typeof authResult>((resolve) => {
          resolveLogin = resolve;
        }),
    );
    useAuthStore.setState({ loginWithGoogle });
    const onSuccess = vi.fn();
    render(<GoogleAuthButton mode="authenticate" onSuccess={onSuccess} />);
    await screen.findByText("Continuer avec Google");

    credentialCallback?.({ credential: "google-id-token" });
    credentialCallback?.({ credential: "google-id-token" });

    expect(loginWithGoogle).toHaveBeenCalledOnce();
    expect(loginWithGoogle).toHaveBeenCalledWith({
      attemptId: attempt.attempt_id,
      nonce: attempt.nonce,
      credential: "google-id-token",
    });
    resolveLogin?.(authResult);
    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledWith(authResult);
    });
  });

  it("keeps the user on the page when the popup is closed without a credential", async () => {
    const loginWithGoogle = vi.fn();
    useAuthStore.setState({ loginWithGoogle });
    render(<GoogleAuthButton mode="authenticate" onSuccess={vi.fn()} />);

    await screen.findByText("Continuer avec Google");

    expect(
      screen.getByText(/Si vous fermez la fenêtre Google/),
    ).toBeInTheDocument();
    expect(loginWithGoogle).not.toHaveBeenCalled();
  });

  it("shows a retryable backend error without authenticating", async () => {
    useAuthStore.setState({
      loginWithGoogle: vi.fn().mockRejectedValue(new Error("rejected")),
    });
    render(<GoogleAuthButton mode="authenticate" onSuccess={vi.fn()} />);
    await screen.findByText("Continuer avec Google");

    credentialCallback?.({ credential: "rejected-token" });

    expect(
      await screen.findByText(/connexion à Google n’a pas pu être chargée/),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Réessayer avec Google" }),
    ).toBeEnabled();
  });

  it("uses the authenticated linking endpoints in link mode", async () => {
    mockedLink.mockResolvedValue({
      linked: true,
      message: "Google a été lié à votre compte TaskMiner.",
    });
    const onSuccess = vi.fn();
    render(<GoogleAuthButton mode="link" onSuccess={onSuccess} />);
    await screen.findByText("Continuer avec Google");

    credentialCallback?.({ credential: "link-token" });

    await waitFor(() => {
      expect(mockedLink).toHaveBeenCalledOnce();
    });
    expect(mockedLinkAttempt).toHaveBeenCalledOnce();
    expect(onSuccess).toHaveBeenCalledWith({
      linked: true,
      message: "Google a été lié à votre compte TaskMiner.",
    });
  });

  it("renders nothing when Google is not configured", () => {
    vi.stubEnv("VITE_GOOGLE_CLIENT_ID", "");

    const { container } = render(
      <GoogleAuthButton mode="authenticate" onSuccess={vi.fn()} />,
    );

    expect(container).toBeEmptyDOMElement();
    expect(mockedLoadGoogle).not.toHaveBeenCalled();
  });
});
