import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { LoginForm } from "@/features/auth/components/login-form";

describe("LoginForm", () => {
  it("validates and submits credentials", async () => {
    const user = userEvent.setup();
    const handleSubmit = vi.fn();

    render(<LoginForm onSubmit={handleSubmit} />);
    await user.type(
      screen.getByRole("textbox", { name: "Adresse e-mail" }),
      "ada@example.com",
    );
    await user.type(screen.getByLabelText("Mot de passe"), "password123");
    await user.click(screen.getByRole("button", { name: "Se connecter" }));

    await waitFor(() => {
      expect(handleSubmit).toHaveBeenCalledOnce();
    });
    expect(handleSubmit.mock.calls[0]?.[0]).toEqual({
      email: "ada@example.com",
      password: "password123",
    });
  });

  it("shows validation feedback for an invalid email", async () => {
    const user = userEvent.setup();

    render(<LoginForm />);
    await user.type(
      screen.getByRole("textbox", { name: "Adresse e-mail" }),
      "invalid",
    );
    await user.type(screen.getByLabelText("Mot de passe"), "password123");
    await user.click(screen.getByRole("button", { name: "Se connecter" }));

    expect(
      await screen.findByText("Saisissez une adresse e-mail valide."),
    ).toBeInTheDocument();
  });
});
