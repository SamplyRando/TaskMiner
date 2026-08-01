import { describe, expect, it } from "vitest";

import { invitationFormSchema } from "@/features/invitations/schemas";

describe("invitationFormSchema", () => {
  it("accepts and normalizes a supported invitation", () => {
    expect(
      invitationFormSchema.parse({ email: "ada@example.com", role: "member" }),
    ).toEqual({ email: "ada@example.com", role: "member" });
  });

  it("rejects invalid emails and unsupported roles", () => {
    expect(
      invitationFormSchema.safeParse({ email: "invalid", role: "owner" })
        .success,
    ).toBe(false);
  });
});
