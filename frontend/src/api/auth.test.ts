import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  confirmEmailVerification,
  confirmPasswordReset,
  requestEmailVerification,
  requestPasswordReset,
} from "@/api/auth";
import { apiClient } from "@/api/client";

const response = {
  already_completed: false,
  message: "Action enregistrée.",
};

describe("account lifecycle API", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("uses the generic password-reset request endpoint", async () => {
    const post = vi
      .spyOn(apiClient, "post")
      .mockResolvedValue({ data: response });

    await expect(requestPasswordReset("ada@example.com")).resolves.toEqual(
      response,
    );
    expect(post).toHaveBeenCalledWith("/auth/password-reset/request", {
      email: "ada@example.com",
    });
  });

  it("maps reviewed password fields to the backend contract", async () => {
    const post = vi
      .spyOn(apiClient, "post")
      .mockResolvedValue({ data: response });

    await confirmPasswordReset({
      confirmation: "Strong-password-123!",
      newPassword: "Strong-password-123!",
      token: "opaque-token",
    });

    expect(post).toHaveBeenCalledWith("/auth/password-reset/confirm", {
      confirmation: "Strong-password-123!",
      new_password: "Strong-password-123!",
      token: "opaque-token",
    });
  });

  it("requests and confirms email verification through dedicated endpoints", async () => {
    const post = vi
      .spyOn(apiClient, "post")
      .mockResolvedValue({ data: response });

    await requestEmailVerification("ada@example.com");
    await confirmEmailVerification("opaque-token");

    expect(post).toHaveBeenNthCalledWith(
      1,
      "/auth/email-verification/request",
      {
        email: "ada@example.com",
      },
    );
    expect(post).toHaveBeenNthCalledWith(
      2,
      "/auth/email-verification/confirm",
      {
        token: "opaque-token",
      },
    );
  });
});
