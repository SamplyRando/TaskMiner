import { useAuthStore } from "@/store/auth-store";
import type { UserProfile } from "@/types/auth";

export const fakeUser: UserProfile = {
  id: "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
  email: "ada@example.com",
  full_name: "Ada Lovelace",
  is_active: true,
  created_at: "2026-07-29T10:00:00Z",
  updated_at: "2026-07-29T10:00:00Z",
};

const encodeBase64Url = (value: object): string =>
  btoa(JSON.stringify(value))
    .replaceAll("=", "")
    .replaceAll("+", "-")
    .replaceAll("/", "_");

export const createFakeAccessToken = ({
  expiresAt = Math.floor(Date.now() / 1000) + 3600,
  subject = fakeUser.id,
}: {
  expiresAt?: number;
  subject?: string;
} = {}): string =>
  `${encodeBase64Url({ alg: "HS256", typ: "JWT" })}.${encodeBase64Url({
    exp: expiresAt,
    iat: Math.floor(Date.now() / 1000),
    sub: subject,
  })}.signature`;

export const resetAuthStore = (): void => {
  useAuthStore.getState().logout();
  useAuthStore.setState({
    error: null,
    isAuthenticated: false,
    isHydrated: true,
    isLoading: false,
    pendingUser: null,
  });
};

export const authenticateStore = (user = fakeUser): void => {
  useAuthStore.setState({
    accessToken: createFakeAccessToken({ subject: user.id }),
    tokenType: "bearer",
    refreshToken: null,
    currentUser: user,
    isAuthenticated: true,
    isHydrated: true,
  });
};
