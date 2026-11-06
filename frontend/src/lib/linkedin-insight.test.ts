import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  createLinkedInInsightTag,
  LINKEDIN_INSIGHT_SCRIPT_URL,
  LINKEDIN_REGISTRATION_CONVERSION_ID,
} from "@/lib/linkedin-insight";

const PARTNER_ID = "10035210";

type LinkedInWindow = Window & {
  _linkedin_data_partner_ids?: string[];
  _linkedin_partner_id?: string;
  lintrk?: { q: unknown[][]; taskminerBlocked?: boolean };
};

const linkedInWindow = window as LinkedInWindow;
const scripts = () =>
  document.querySelectorAll(`script[src="${LINKEDIN_INSIGHT_SCRIPT_URL}"]`);
const visit = (url: string) => {
  window.history.replaceState(null, "", url);
};
const createTag = (enabled = true) =>
  createLinkedInInsightTag({
    isEnabled: () => enabled,
    partnerId: PARTNER_ID,
  });
const setReferrer = (value: string) => {
  Object.defineProperty(document, "referrer", {
    configurable: true,
    value,
  });
};

describe("LinkedIn Insight Tag", () => {
  beforeEach(() => {
    sessionStorage.clear();
    visit("/");
  });

  afterEach(() => {
    for (const script of scripts()) script.remove();
    delete linkedInWindow._linkedin_data_partner_ids;
    delete linkedInWindow._linkedin_partner_id;
    delete linkedInWindow.lintrk;
    for (const name of [
      "li_fat_id",
      "li_giant",
      "ln_or",
      "oribi_cookie_test",
      "oribili_user_guid",
      "taskminer-test",
    ]) {
      document.cookie = `${name}=; max-age=0; path=/`;
    }
    setReferrer("");
    sessionStorage.clear();
    visit("/");
  });

  it("loads no LinkedIn resource before marketing consent", () => {
    const tag = createTag();

    tag.update(false);

    expect(scripts()).toHaveLength(0);
    expect(linkedInWindow.lintrk).toBeUndefined();
    expect(
      document.querySelector('img[src*="px.ads.linkedin.com"]'),
    ).toBeNull();
    expect(document.querySelector("noscript")).toBeNull();
  });

  it("installs the official tag once after consent", () => {
    const tag = createTag();

    tag.update(true);
    tag.update(true);
    visit("/privacy");
    tag.update(true);

    expect(scripts()).toHaveLength(1);
    expect(linkedInWindow._linkedin_partner_id).toBe(PARTNER_ID);
    expect(linkedInWindow._linkedin_data_partner_ids).toEqual([PARTNER_ID]);
    expect(linkedInWindow.lintrk?.q).toEqual([]);
    expect(document.querySelector("noscript")).toBeNull();
  });

  it.each([
    "/login",
    "/register",
    "/forgot-password",
    "/reset-password",
    "/verify-email",
    "/app",
    "/app/invitations",
    "/legal?token=secret-token",
    "/privacy?access_token=secret-token",
    "/?code=secret-code",
    "/privacy#access_token=secret-token",
  ])("never loads on the sensitive URL %s", (url) => {
    const tag = createTag();
    visit(url);

    tag.update(true);

    expect(scripts()).toHaveLength(0);
    expect(linkedInWindow.lintrk).toBeUndefined();
    expect(linkedInWindow._linkedin_partner_id).toBeUndefined();
    expect(linkedInWindow._linkedin_data_partner_ids).toEqual([]);
  });

  it("stays off when opened from a same-origin sensitive page", () => {
    setReferrer(`${window.location.origin}/verify-email?token=secret`);

    createTag().update(true);

    expect(scripts()).toHaveLength(0);
  });

  it("deactivates on a sensitive navigation without reinstalling the script", () => {
    const tag = createTag();
    tag.update(true);
    expect(scripts()).toHaveLength(1);

    visit("/app/invitations?token=secret");
    tag.update(true);

    expect(scripts()).toHaveLength(0);
    expect(linkedInWindow.lintrk?.taskminerBlocked).toBe(true);
    expect(linkedInWindow.lintrk?.q).toEqual([]);
    expect(linkedInWindow._linkedin_data_partner_ids).toEqual([]);
  });

  it("withdraws consent, clears accessible LinkedIn cookies and preserves others", () => {
    const tag = createTag();
    tag.update(true);
    document.cookie = "li_fat_id=linkedin-id; path=/";
    document.cookie = "ln_or=linkedin-state; path=/";
    document.cookie = "taskminer-test=kept; path=/";

    tag.update(false);
    tag.update(false);

    expect(scripts()).toHaveLength(0);
    expect(linkedInWindow.lintrk?.taskminerBlocked).toBe(true);
    expect(linkedInWindow.lintrk?.q).toEqual([]);
    expect(document.cookie).not.toMatch(/li_fat_id=|ln_or=/);
    expect(document.cookie).toContain("taskminer-test=kept");
  });

  it("can load one fresh tag after consent is granted again", () => {
    const tag = createTag();
    tag.update(true);
    tag.update(false);

    tag.update(true);
    tag.update(true);

    expect(scripts()).toHaveLength(1);
    expect(linkedInWindow.lintrk?.taskminerBlocked).not.toBe(true);
    expect(linkedInWindow._linkedin_data_partner_ids).toEqual([PARTNER_ID]);
  });

  it("stays inactive outside approved production conditions", () => {
    createTag(false).update(true);

    expect(scripts()).toHaveLength(0);
    expect(linkedInWindow.lintrk).toBeUndefined();
  });

  it("tracks a confirmed registration after consent and tag loading, without account data", async () => {
    const tag = createTag();
    visit("/register");
    tag.update(true);

    const tracking = tag.trackRegistrationConversion("internal-user-id");

    expect(scripts()).toHaveLength(1);
    expect(linkedInWindow.lintrk?.q).toEqual([]);
    scripts()[0]?.dispatchEvent(new Event("load"));

    await expect(tracking).resolves.toBe(true);
    expect(linkedInWindow.lintrk?.q).toEqual([
      ["track", { conversion_id: LINKEDIN_REGISTRATION_CONVERSION_ID }],
    ]);
    expect(JSON.stringify(linkedInWindow.lintrk?.q)).not.toContain(
      "internal-user-id",
    );
  });

  it("does not track a registration when marketing consent is refused", async () => {
    const tag = createTag();
    visit("/register");
    tag.update(false);

    await expect(
      tag.trackRegistrationConversion("internal-user-id"),
    ).resolves.toBe(false);

    expect(scripts()).toHaveLength(0);
    expect(linkedInWindow.lintrk).toBeUndefined();
  });

  it("deduplicates concurrent and repeated registration conversions", async () => {
    const tag = createTag();
    visit("/register");
    tag.update(true);

    const first = tag.trackRegistrationConversion("internal-user-id");
    const concurrent = tag.trackRegistrationConversion("internal-user-id");
    scripts()[0]?.dispatchEvent(new Event("load"));

    await expect(first).resolves.toBe(true);
    await expect(concurrent).resolves.toBe(true);
    await expect(
      tag.trackRegistrationConversion("internal-user-id"),
    ).resolves.toBe(false);
    expect(linkedInWindow.lintrk?.q).toHaveLength(1);

    const remountedTag = createTag();
    remountedTag.update(true);
    await expect(
      remountedTag.trackRegistrationConversion("internal-user-id"),
    ).resolves.toBe(false);
    expect(scripts()).toHaveLength(0);
  });

  it("cancels a pending conversion when consent is withdrawn", async () => {
    const tag = createTag();
    visit("/register");
    tag.update(true);
    const tracking = tag.trackRegistrationConversion("internal-user-id");
    const script = scripts()[0];

    tag.update(false);
    script?.dispatchEvent(new Event("load"));

    await expect(tracking).resolves.toBe(false);
    expect(linkedInWindow.lintrk?.q).toEqual([]);
    expect(scripts()).toHaveLength(0);
  });

  it("does not track from a registration URL carrying a token", async () => {
    const tag = createTag();
    visit("/register?token=secret");
    tag.update(true);

    await expect(
      tag.trackRegistrationConversion("internal-user-id"),
    ).resolves.toBe(false);

    expect(scripts()).toHaveLength(0);
  });
});
