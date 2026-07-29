import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { loginUser } from "@/api/auth";
import { ApiError } from "@/api/client";
import { LoginPage } from "@/pages/login-page";
import { useAuthStore } from "@/store/auth-store";
import { createFakeAccessToken, resetAuthStore } from "@/test/auth-fixtures";

vi.mock("@/api/auth", () => ({
  loginUser: vi.fn(),
  registerUser: vi.fn(),
}));

const mockedLoginUser = vi.mocked(loginUser);

const fillLoginForm = async (): Promise<void> => {
  const user = userEvent.setup();
  await user.type(
    screen.getByRole("textbox", { name: "Adresse e-mail" }),
    "ada@example.com",
  );
  await user.type(screen.getByLabelText("Mot de passe"), "password123");
  await user.click(screen.getByRole("button", { name: "Se connecter" }));
};

const renderLoginPage = () =>
  render(
    <MemoryRouter initialEntries={["/login"]}>
      <Routes>
        <Route element={<LoginPage />} path="/login" />
        <Route element={<div>Espace authentifié</div>} path="/app" />
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
});
