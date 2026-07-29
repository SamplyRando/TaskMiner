import {
  AxiosError,
  AxiosHeaders,
  type AxiosAdapter,
  type AxiosResponse,
} from "axios";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { apiClient } from "@/api/client";
import { AUTH_UNAUTHORIZED_EVENT } from "@/lib/auth-events";
import { useAuthStore } from "@/store/auth-store";
import { authenticateStore, resetAuthStore } from "@/test/auth-fixtures";

const createErrorAdapter =
  (status: number, data: unknown): AxiosAdapter =>
  (config) => {
    const response: AxiosResponse = {
      config,
      data,
      headers: new AxiosHeaders(),
      status,
      statusText: "Request failed",
    };

    return Promise.reject(
      new AxiosError(
        "Request failed",
        "ERR_BAD_REQUEST",
        config,
        undefined,
        response,
      ),
    );
  };

const createNetworkErrorAdapter =
  (code: string): AxiosAdapter =>
  (config) =>
    Promise.reject(
      new AxiosError("Network request failed", code, config, undefined),
    );

describe("apiClient", () => {
  beforeEach(() => {
    resetAuthStore();
  });

  it("clears the session and publishes a redirect event after a 401", async () => {
    authenticateStore();
    const unauthorizedListener = vi.fn();
    window.addEventListener(AUTH_UNAUTHORIZED_EVENT, unauthorizedListener);

    await expect(
      apiClient.get("/protected", {
        adapter: createErrorAdapter(401, { detail: "Token expired." }),
      }),
    ).rejects.toMatchObject({
      message: "Token expired.",
      status: 401,
    });

    expect(useAuthStore.getState().accessToken).toBeNull();
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(unauthorizedListener).toHaveBeenCalledOnce();
    window.removeEventListener(AUTH_UNAUTHORIZED_EVENT, unauthorizedListener);
  });

  it("normalizes FastAPI validation errors", async () => {
    await expect(
      apiClient.post("/auth/login", undefined, {
        adapter: createErrorAdapter(422, {
          detail: [{ msg: "Field required" }, { msg: "Invalid email" }],
        }),
      }),
    ).rejects.toMatchObject({
      message: "Field required Invalid email",
      status: 422,
    });
  });

  it("returns a clear message when the backend is unavailable", async () => {
    await expect(
      apiClient.get("/health", {
        adapter: createNetworkErrorAdapter("ERR_NETWORK"),
      }),
    ).rejects.toMatchObject({
      message: "Impossible de joindre le serveur. Vérifiez votre connexion.",
    });
  });

  it("returns a clear message when a request times out", async () => {
    await expect(
      apiClient.get("/health", {
        adapter: createNetworkErrorAdapter("ECONNABORTED"),
      }),
    ).rejects.toMatchObject({
      message:
        "Le serveur met trop de temps à répondre. Réessayez dans un instant.",
    });
  });
});
