import { describe, expect, it } from "vitest";

import { registerSchema } from "@/features/auth/schemas";

const registration = {
  confirmPassword: "Strong-password-123!",
  email: "ada@example.com",
  fullName: "Ada Lovelace",
  password: "Strong-password-123!",
};

describe("registerSchema", () => {
  it("accepts a password matching the production strength policy", () => {
    expect(registerSchema.safeParse(registration).success).toBe(true);
  });

  it.each([
    "short1!A",
    "NO-LOWERCASE-123!",
    "no-uppercase-123!",
    "No-digits-password!",
    "NoSpecialPassword123",
  ])("rejects weak registration password %s", (password) => {
    expect(
      registerSchema.safeParse({
        ...registration,
        confirmPassword: password,
        password,
      }).success,
    ).toBe(false);
  });
});
