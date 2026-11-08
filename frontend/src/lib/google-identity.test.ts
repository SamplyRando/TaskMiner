import { afterEach, describe, expect, it, vi } from "vitest";

import {
  loadGoogleIdentity,
  resetGoogleIdentityLoaderForTests,
  type GoogleIdentityApi,
} from "@/lib/google-identity";

type GoogleIdentityWindow = Window & { google?: GoogleIdentityApi };
const googleWindow = window as GoogleIdentityWindow;

describe("Google Identity loader", () => {
  afterEach(() => {
    document.querySelector("script[data-taskminer-google-identity]")?.remove();
    delete googleWindow.google;
    resetGoogleIdentityLoaderForTests();
  });

  it("loads the official GIS script once across concurrent callers", async () => {
    const first = loadGoogleIdentity();
    const second = loadGoogleIdentity();
    const scripts = document.querySelectorAll(
      "script[data-taskminer-google-identity]",
    );
    expect(scripts).toHaveLength(1);
    expect(scripts[0]).toHaveAttribute(
      "src",
      "https://accounts.google.com/gsi/client",
    );
    const api = {
      accounts: {
        id: {
          disableAutoSelect: vi.fn(),
          initialize: vi.fn(),
          renderButton: vi.fn(),
        },
      },
    } satisfies GoogleIdentityApi;
    googleWindow.google = api;
    scripts[0]?.dispatchEvent(new Event("load"));

    await expect(first).resolves.toBe(api);
    await expect(second).resolves.toBe(api);
  });
});
