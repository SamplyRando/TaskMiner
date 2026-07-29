import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it } from "vitest";

import { ProtectedRoute } from "@/routes/protected-route";
import { PublicRoute } from "@/routes/public-route";
import { authenticateStore, resetAuthStore } from "@/test/auth-fixtures";

describe("authentication routes", () => {
  beforeEach(() => {
    resetAuthStore();
  });

  it("redirects anonymous visitors to login", () => {
    render(
      <MemoryRouter initialEntries={["/app"]}>
        <Routes>
          <Route element={<div>Connexion requise</div>} path="/login" />
          <Route element={<ProtectedRoute />}>
            <Route element={<div>Espace privé</div>} path="/app" />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText("Connexion requise")).toBeInTheDocument();
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
