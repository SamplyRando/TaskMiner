import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { registerUser } from "@/api/auth";
import { ApiError } from "@/api/client";
import { RegisterPage } from "@/pages/register-page";
import { fakeUser, resetAuthStore } from "@/test/auth-fixtures";

vi.mock("@/api/auth", () => ({
  loginUser: vi.fn(),
  registerUser: vi.fn(),
}));

const mockedRegisterUser = vi.mocked(registerUser);

const fillRegisterForm = async (): Promise<void> => {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText("Nom complet"), "Ada Lovelace");
  await user.type(
    screen.getByRole("textbox", { name: "Adresse e-mail" }),
    "ada@example.com",
  );
  await user.type(screen.getByLabelText("Mot de passe"), "password123");
  await user.type(
    screen.getByLabelText("Confirmer le mot de passe"),
    "password123",
  );
  await user.click(screen.getByRole("button", { name: "Créer mon compte" }));
};

const renderRegisterPage = () =>
  render(
    <MemoryRouter initialEntries={["/register"]}>
      <Routes>
        <Route element={<RegisterPage />} path="/register" />
        <Route element={<div>Page de connexion</div>} path="/login" />
      </Routes>
    </MemoryRouter>,
  );

describe("RegisterPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetAuthStore();
  });

  it("registers an account and redirects to login", async () => {
    mockedRegisterUser.mockResolvedValue(fakeUser);
    renderRegisterPage();

    await fillRegisterForm();

    expect(await screen.findByText("Page de connexion")).toBeInTheDocument();
    expect(mockedRegisterUser).toHaveBeenCalledWith({
      email: "ada@example.com",
      fullName: "Ada Lovelace",
      password: "password123",
    });
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
  });
});
