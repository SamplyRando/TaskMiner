import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { loginUser, registerUser } from "@/api/auth";
import { ApiError, configureApiAuth } from "@/api/client";
import { publishUnauthorized } from "@/lib/auth-events";
import { decodeAccessToken, isAccessTokenExpired } from "@/lib/jwt";
import type { LoginCredentials, RegisterData, UserProfile } from "@/types/auth";

const AUTH_STORAGE_KEY = "taskminer-auth";

type AuthState = {
  accessToken: string | null;
  tokenType: "bearer" | null;
  refreshToken: string | null;
  currentUser: UserProfile | null;
  pendingUser: UserProfile | null;
  isAuthenticated: boolean;
  isHydrated: boolean;
  isLoading: boolean;
  error: string | null;
  register: (data: RegisterData) => Promise<UserProfile>;
  login: (credentials: LoginCredentials) => Promise<void>;
  hydrate: () => Promise<void>;
  logout: () => void;
  clearError: () => void;
};

type PersistedAuthState = Pick<
  AuthState,
  "accessToken" | "tokenType" | "refreshToken" | "currentUser"
>;

const emptySession = {
  accessToken: null,
  tokenType: null,
  refreshToken: null,
  currentUser: null,
  pendingUser: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
} satisfies Pick<
  AuthState,
  | "accessToken"
  | "tokenType"
  | "refreshToken"
  | "currentUser"
  | "pendingUser"
  | "isAuthenticated"
  | "isLoading"
  | "error"
>;

const getErrorMessage = (error: unknown): string =>
  error instanceof ApiError
    ? error.message
    : "Une erreur inattendue est survenue.";

const normalizeEmail = (email: string): string => email.trim().toLowerCase();

const createMinimalProfile = (
  credentials: LoginCredentials,
  userId: string,
): UserProfile => ({
  id: userId,
  email: normalizeEmail(credentials.email),
  full_name: null,
  is_active: true,
  created_at: null,
  updated_at: null,
});

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      ...emptySession,
      isHydrated: false,
      register: async (data) => {
        set({ error: null, isLoading: true });
        try {
          const user = await registerUser(data);
          set({ pendingUser: user });
          return user;
        } catch (error: unknown) {
          set({ error: getErrorMessage(error) });
          throw error;
        } finally {
          set({ isLoading: false });
        }
      },
      login: async (credentials) => {
        set({ error: null, isLoading: true });
        try {
          const token = await loginUser({
            email: normalizeEmail(credentials.email),
            password: credentials.password,
          });
          const payload = decodeAccessToken(token.access_token);

          if (isAccessTokenExpired(token.access_token)) {
            throw new ApiError("Le jeton reçu est déjà expiré.");
          }

          const pendingUser = get().pendingUser;
          const currentUser =
            pendingUser?.email.toLowerCase() ===
            normalizeEmail(credentials.email)
              ? pendingUser
              : createMinimalProfile(credentials, payload.sub);

          set({
            accessToken: token.access_token,
            tokenType: token.token_type,
            refreshToken: null,
            currentUser,
            pendingUser: null,
            isAuthenticated: true,
          });
        } catch (error: unknown) {
          set({ error: getErrorMessage(error) });
          throw error;
        } finally {
          set({ isLoading: false });
        }
      },
      hydrate: () => {
        if (get().isHydrated || get().isLoading) {
          return Promise.resolve();
        }

        const accessToken = get().accessToken;
        if (!accessToken) {
          set({ isAuthenticated: false, isHydrated: true });
          return Promise.resolve();
        }

        try {
          if (isAccessTokenExpired(accessToken)) {
            get().logout();
            return Promise.resolve();
          }
          set({ isAuthenticated: true });
        } catch {
          get().logout();
        } finally {
          set({ isHydrated: true });
        }
        return Promise.resolve();
      },
      logout: () => {
        set({ ...emptySession, isHydrated: true });
        localStorage.removeItem(AUTH_STORAGE_KEY);
      },
      clearError: () => {
        set({ error: null });
      },
    }),
    {
      name: AUTH_STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: ({ accessToken, currentUser, refreshToken, tokenType }) => ({
        accessToken,
        tokenType,
        refreshToken,
        currentUser,
      }),
      version: 2,
      migrate: (persistedState: unknown, version): PersistedAuthState => {
        if (version >= 2) {
          return persistedState as PersistedAuthState;
        }

        const previousState = persistedState as {
          accessToken?: string | null;
          refreshToken?: string | null;
          user?: UserProfile | null;
        };
        return {
          accessToken: previousState.accessToken ?? null,
          tokenType: previousState.accessToken ? "bearer" : null,
          refreshToken: previousState.refreshToken ?? null,
          currentUser: previousState.user ?? null,
        };
      },
    },
  ),
);

configureApiAuth({
  getAccessToken: () => useAuthStore.getState().accessToken,
  onUnauthorized: () => {
    useAuthStore.getState().logout();
    publishUnauthorized();
  },
});
