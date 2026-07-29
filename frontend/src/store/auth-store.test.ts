import { beforeEach, describe, expect, it, vi } from "vitest";

import { loginUser, registerUser } from "@/api/auth";
import { ApiError } from "@/api/client";
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

describe("useAuthStore", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetAuthStore();
  });

  it("registers a user and reuses the returned profile during login", async () => {
    const accessToken = createFakeAccessToken();
    mockedRegisterUser.mockResolvedValue(fakeUser);
    mockedLoginUser.mockResolvedValue({
      access_token: accessToken,
      token_type: "bearer",
    });

    await useAuthStore.getState().register({
      email: fakeUser.email,
      fullName: fakeUser.full_name ?? "Ada Lovelace",
      password: "password123",
    });
    await useAuthStore.getState().login({
      email: "  ADA@EXAMPLE.COM ",
      password: "password123",
    });

    expect(mockedLoginUser).toHaveBeenCalledWith({
      email: fakeUser.email,
      password: "password123",
    });
    expect(useAuthStore.getState()).toMatchObject({
      accessToken,
      tokenType: "bearer",
      currentUser: fakeUser,
      isAuthenticated: true,
    });
  });

  it("keeps the backend login error", async () => {
    mockedLoginUser.mockRejectedValue(
      new ApiError("Invalid email or password.", 401),
    );

    await expect(
      useAuthStore.getState().login({
        email: fakeUser.email,
        password: "wrong-password",
      }),
    ).rejects.toBeInstanceOf(ApiError);

    expect(useAuthStore.getState().error).toBe("Invalid email or password.");
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });

  it("hydrates a persisted session", async () => {
    const accessToken = createFakeAccessToken();
    const persistedSession = JSON.stringify({
      state: {
        accessToken,
        tokenType: "bearer",
        refreshToken: null,
        currentUser: fakeUser,
      },
      version: 2,
    });
    resetAuthStore();
    useAuthStore.setState({ isHydrated: false });
    localStorage.setItem("taskminer-auth", persistedSession);
    await useAuthStore.persist.rehydrate();
    await useAuthStore.getState().hydrate();

    expect(useAuthStore.getState()).toMatchObject({
      accessToken,
      currentUser: fakeUser,
      isAuthenticated: true,
      isHydrated: true,
    });
  });

  it("clears authentication and persisted data on logout", () => {
    useAuthStore.setState({
      accessToken: createFakeAccessToken(),
      tokenType: "bearer",
      currentUser: fakeUser,
      isAuthenticated: true,
    });

    useAuthStore.getState().logout();

    expect(useAuthStore.getState()).toMatchObject({
      accessToken: null,
      tokenType: null,
      currentUser: null,
      isAuthenticated: false,
    });
    expect(localStorage.getItem("taskminer-auth")).toBeNull();
  });
});
