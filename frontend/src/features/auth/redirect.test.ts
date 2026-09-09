import { describe, expect, it } from "vitest";

import { getSafeAuthDestination } from "@/features/auth/redirect";

describe("getSafeAuthDestination", () => {
  it("preserves an internal application path, query, and hash", () => {
    expect(
      getSafeAuthDestination({
        pathname: "/app/invitations",
        search: "?token=ABC%2F123",
        hash: "#accept",
      }),
    ).toBe("/app/invitations?token=ABC%2F123#accept");
  });

  it.each([
    "https://evil.example/steal",
    "//evil.example/steal",
    "/login?next=https://evil.example",
    { pathname: "https://evil.example/steal" },
  ])("rejects external or non-application destinations", (destination) => {
    expect(getSafeAuthDestination(destination)).toBe("/app");
  });
});
