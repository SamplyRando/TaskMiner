import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { beforeEach, describe, expect, it } from "vitest";

import { ProtectedRoute } from "@/routes/protected-route";
import { PublicRoute } from "@/routes/public-route";
import { authenticateStore, resetAuthStore } from "@/test/auth-fixtures";

describe("authentication routes", () => {
  beforeEach(() => {
    resetAuthStore();
  });

  it("redirects anonymous visitors to login", () => {
    const LoginTarget = () => {
      const location = useLocation();
      const from = (location.state as { from?: string } | null)?.from;
      return <div>{from}</div>;
    };
    render(
      <MemoryRouter initialEntries={["/app/invitations?token=ABC#accept"]}>
        <Routes>
          <Route element={<LoginTarget />} path="/login" />
          <Route element={<ProtectedRoute />}>
            <Route element={<div>Espace privé</div>} path="/app/invitations" />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    expect(
      screen.getByText("/app/invitations?token=ABC#accept"),
    ).toBeInTheDocument();
  });

  it("renders protected content for authenticated users", () => {
    authenticateStore();

    render(
      <MemoryRouter initialEntries={["/app"]}>
        <Routes>
          <Route element={<ProtectedRoute />}>
            <Route element={<div>Espace privé</div>} path="/app" />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText("Espace privé")).toBeInTheDocument();
  });

  it("keeps authenticated users away from public auth pages", () => {
    authenticateStore();

    render(
      <MemoryRouter initialEntries={["/login"]}>
        <Routes>
          <Route element={<PublicRoute />}>
            <Route element={<div>Connexion</div>} path="/login" />
          </Route>
          <Route element={<div>Espace privé</div>} path="/app" />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText("Espace privé")).toBeInTheDocument();
    expect(screen.queryByText("Connexion")).not.toBeInTheDocument();
  });
});
