import { beforeEach, describe, expect, it } from "vitest";

import {
  clearRememberedAuthDestination,
  getRememberedAuthDestination,
  getSafeAuthDestination,
  rememberAuthDestination,
} from "@/features/auth/redirect";

describe("getSafeAuthDestination", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

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

  it("remembers only a safe internal destination for the verification handoff", () => {
    rememberAuthDestination("/app/invitations?token=ABC%2F123#accept");

    expect(getRememberedAuthDestination()).toBe(
      "/app/invitations?token=ABC%2F123#accept",
    );
    rememberAuthDestination("https://evil.example/steal");
    expect(getRememberedAuthDestination()).toBe("/app");
    clearRememberedAuthDestination();
    expect(getRememberedAuthDestination()).toBeUndefined();
  });
});
