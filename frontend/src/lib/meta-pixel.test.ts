import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { createMetaPixel, metaPixel } from "@/lib/meta-pixel";

const PIXEL_ID = "1465527144910879";
const SCRIPT_URL = "https://connect.facebook.net/en_US/fbevents.js";

type PixelStub = {
  allowDuplicatePageViews?: boolean;
  disablePushState?: boolean;
  queue: unknown[][];
};

const pixelWindow = window as Window & { _fbq?: unknown; fbq?: PixelStub };

const pixelScripts = () =>
  document.querySelectorAll(`script[src="${SCRIPT_URL}"]`);

const queuedCalls = () => pixelWindow.fbq?.queue ?? [];

const callsTo = (method: string) =>
  queuedCalls().filter((call) => call[0] === method);

const pageViews = () =>
  queuedCalls().filter((call) => call[0] === "track" && call[1] === "PageView");

const visit = (url: string) => {
  window.history.replaceState(null, "", url);
};

const createPixel = (enabled = true) =>
  createMetaPixel({ isEnabled: () => enabled, pixelId: PIXEL_ID });

const setReferrer = (value: string) => {
  Object.defineProperty(document, "referrer", {
    configurable: true,
    value,
  });
};

describe("Meta Pixel", () => {
  beforeEach(() => {
    visit("/");
  });

  afterEach(() => {
    delete pixelWindow.fbq;
    delete pixelWindow._fbq;
    for (const script of pixelScripts()) script.remove();
    for (const name of ["_fbp", "_fbc"]) {
      document.cookie = `${name}=; max-age=0; path=/`;
    }
    setReferrer("");
    visit("/");
  });

  it("loads nothing and sends nothing without consent", () => {
    const pixel = createPixel();

    pixel.update(false);
    pixel.trackPageView("/");
    pixel.track("CompleteRegistration");

    expect(pixelScripts()).toHaveLength(0);
    expect(pixelWindow.fbq).toBeUndefined();
  });

  it("installs the official base code once, without automatic features or noscript fallback", () => {
    const pixel = createPixel();

    pixel.update(true);
    pixel.update(true);

    expect(pixelScripts()).toHaveLength(1);
    expect(document.querySelector("noscript")).toBeNull();
    expect(pixelWindow.fbq?.disablePushState).toBe(true);
    expect(pixelWindow.fbq?.allowDuplicatePageViews).toBe(true);
    expect(queuedCalls()).toEqual([
      ["set", "autoConfig", false, PIXEL_ID],
      ["init", PIXEL_ID],
    ]);
  });

  it("sends one PageView per page, including client-side navigations", () => {
    const pixel = createPixel();
    pixel.update(true);

    pixel.trackPageView("/");
    pixel.trackPageView("/");
    visit("/register");
    pixel.trackPageView("/register");
    visit("/");
    pixel.trackPageView("/");

    expect(pageViews()).toHaveLength(3);
  });

  it("sends the standard conversion events only with consent", () => {
    const pixel = createPixel();
    pixel.track("CompleteRegistration");
    expect(pixelWindow.fbq).toBeUndefined();

    pixel.update(true);
    pixel.track("CompleteRegistration");
    pixel.track("InitiateCheckout", {
      content_name: "TaskMiner Pro",
      currency: "EUR",
      value: 12,
    });

    expect(callsTo("track")).toEqual([
      ["track", "CompleteRegistration"],
      [
        "track",
        "InitiateCheckout",
        { content_name: "TaskMiner Pro", currency: "EUR", value: 12 },
      ],
    ]);
  });

  it("never loads on a URL carrying a token", () => {
    const pixel = createPixel();
    visit("/reset-password?token=secret-reset-token");

    pixel.update(true);
    pixel.trackPageView("/reset-password?token=secret-reset-token");

    expect(pixelScripts()).toHaveLength(0);

    visit("/login");
    pixel.update(true);
    pixel.trackPageView("/login");

    expect(pixelScripts()).toHaveLength(1);
    expect(pageViews()).toHaveLength(1);
    expect(JSON.stringify(queuedCalls())).not.toContain("secret-reset-token");
  });

  it("pauses on a token URL reached in the app, then resumes", () => {
    const pixel = createPixel();
    pixel.update(true);

    visit("/app/invitations?token=secret-invitation-token");
    pixel.update(true);
    pixel.trackPageView("/app/invitations?token=secret-invitation-token");
    pixel.track("CompleteRegistration");
    visit("/app/workspace");
    pixel.update(true);
    pixel.trackPageView("/app/workspace");

    expect(queuedCalls().slice(2)).toEqual([
      ["consent", "revoke"],
      ["consent", "grant"],
      ["track", "PageView"],
    ]);
  });

  it("drops the page views the pixel queued on its own while paused", () => {
    const pixel = createPixel();
    pixel.update(true);
    visit("/reset-password?token=secret");
    pixel.update(true);
    // What fbevents.js queues when a paused page is restored from the cache.
    pixelWindow.fbq?.queue.push(["trackCustom", "PageView"]);

    visit("/login");
    pixel.update(true);
    pixel.trackPageView("/login");

    expect(queuedCalls().slice(2)).toEqual([
      ["consent", "revoke"],
      ["consent", "grant"],
      ["track", "PageView"],
    ]);
  });

  it("stays off for a page opened from a same-origin token URL", () => {
    setReferrer(`${window.location.origin}/verify-email?token=secret`);
    const pixel = createPixel();

    pixel.update(true);

    expect(pixelScripts()).toHaveLength(0);
  });

  it("pauses the pixel and deletes its cookies when consent is withdrawn", () => {
    const pixel = createPixel();
    pixel.update(true);
    document.cookie = "_fbp=fb.1.1700000000000.123456789; path=/";
    document.cookie = "_fbc=fb.1.1700000000000.click-id; path=/";
    document.cookie = "taskminer-test=kept; path=/";

    pixel.update(false);
    pixel.trackPageView("/pricing");
    pixel.track("CompleteRegistration");

    expect(callsTo("consent")).toEqual([["consent", "revoke"]]);
    expect(callsTo("track")).toEqual([]);
    expect(document.cookie).not.toMatch(/_fbp=|_fbc=/);
    expect(document.cookie).toContain("taskminer-test=kept");
    document.cookie = "taskminer-test=; max-age=0; path=/";
  });

  it("stays inactive outside production hosts", () => {
    const pixel = createPixel(false);

    pixel.update(true);
    pixel.trackPageView("/");

    expect(pixelScripts()).toHaveLength(0);
    expect(pixelWindow.fbq).toBeUndefined();
  });

  it("is never active in tests or development builds", () => {
    metaPixel.update(true);
    metaPixel.trackPageView("/");

    expect(pixelScripts()).toHaveLength(0);
  });
});
