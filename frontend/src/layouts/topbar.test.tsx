import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import { Topbar } from "@/layouts/topbar";
import {
  authenticateStore,
  fakeUser,
  resetAuthStore,
} from "@/test/auth-fixtures";

describe("Topbar", () => {
  beforeEach(() => {
    resetAuthStore();
    authenticateStore();
  });

  it("shows the authenticated user and exposes the user menu", () => {
    render(<Topbar onMenuClick={() => undefined} />);

    expect(screen.getByText(fakeUser.full_name ?? "")).toBeInTheDocument();
    expect(screen.getByText(fakeUser.email)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Ouvrir le menu utilisateur" }),
    ).toBeInTheDocument();
  });
});
