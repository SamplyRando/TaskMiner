import { act, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it } from "vitest";

import { AuthSessionManager } from "@/components/providers/auth-session-manager";
import { AUTH_UNAUTHORIZED_EVENT } from "@/lib/auth-events";
import { authenticateStore, resetAuthStore } from "@/test/auth-fixtures";

describe("AuthSessionManager", () => {
  beforeEach(() => {
    resetAuthStore();
    authenticateStore();
  });

  it("redirects to login when the API reports an unauthorized session", async () => {
    render(
      <MemoryRouter initialEntries={["/app"]}>
        <AuthSessionManager>
          <Routes>
            <Route element={<div>Connexion</div>} path="/login" />
            <Route element={<div>Application</div>} path="/app" />
          </Routes>
        </AuthSessionManager>
      </MemoryRouter>,
    );

    act(() => {
      window.dispatchEvent(new Event(AUTH_UNAUTHORIZED_EVENT));
    });

    expect(await screen.findByText("Connexion")).toBeInTheDocument();
  });
});
