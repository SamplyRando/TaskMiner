import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  CONSENT_STORAGE_KEY,
  isConsentDecisionCurrent,
  selectHasAdvertisingConsent,
  useConsentStore,
} from "@/store/consent-store";

const storeDecision = (decision: unknown, version = 2) => {
  localStorage.setItem(
    CONSENT_STORAGE_KEY,
    JSON.stringify({ state: { decision }, version }),
  );
};

const monthsAgo = (months: number) => {
  const date = new Date();
  date.setMonth(date.getMonth() - months);
  return date.toISOString();
};

describe("consent store", () => {
  beforeEach(() => {
    localStorage.clear();
    useConsentStore.setState({ decision: null, isPanelOpen: false });
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("starts without a decision, so the banner asks", () => {
    expect(useConsentStore.getState().decision).toBeNull();
    expect(selectHasAdvertisingConsent(useConsentStore.getState())).toBe(false);
  });

  it("persists a dated choice and closes the panel", () => {
    useConsentStore.getState().openPanel();
    useConsentStore.getState().decide(true);

    const state = useConsentStore.getState();
    expect(state.isPanelOpen).toBe(false);
    expect(selectHasAdvertisingConsent(state)).toBe(true);
    const stored = JSON.parse(
      localStorage.getItem(CONSENT_STORAGE_KEY) ?? "{}",
    ) as { state: unknown; version: number };
    expect(stored.version).toBe(2);
    expect(stored.state).toEqual({
      decision: { advertising: true, decidedAt: state.decision?.decidedAt },
    });
  });

  it("restores a recent choice, including a refusal", async () => {
    storeDecision({ advertising: false, decidedAt: monthsAgo(5) });

    await useConsentStore.persist.rehydrate();

    expect(useConsentStore.getState().decision).toEqual({
      advertising: false,
      decidedAt: expect.any(String) as string,
    });
  });

  it("asks again after 6 months", async () => {
    storeDecision({ advertising: true, decidedAt: monthsAgo(7) });

    await useConsentStore.persist.rehydrate();

    expect(useConsentStore.getState().decision).toBeNull();
  });

  it.each([
    ["a malformed value", { advertising: "yes", decidedAt: monthsAgo(1) }],
    ["an invalid date", { advertising: true, decidedAt: "not-a-date" }],
    [
      "a date in the future",
      { advertising: true, decidedAt: "2999-01-01T00:00:00.000Z" },
    ],
  ])("ignores %s", async (_label, decision) => {
    storeDecision(decision);

    await useConsentStore.persist.rehydrate();

    expect(useConsentStore.getState().decision).toBeNull();
  });

  it("asks again when the stored choice belongs to an older version", async () => {
    storeDecision({ advertising: true, decidedAt: monthsAgo(1) }, 0);

    await useConsentStore.persist.rehydrate();

    expect(useConsentStore.getState().decision).toBeNull();
  });

  it("does not reuse consent collected before LinkedIn was added", async () => {
    storeDecision({ advertising: true, decidedAt: monthsAgo(1) }, 1);

    await useConsentStore.persist.rehydrate();

    expect(useConsentStore.getState().decision).toBeNull();
  });

  it("does not persist the panel state", () => {
    useConsentStore.getState().decide(false);
    useConsentStore.getState().openPanel();

    expect(localStorage.getItem(CONSENT_STORAGE_KEY)).not.toContain(
      "isPanelOpen",
    );
  });

  it("keeps a decision valid for exactly 6 months", () => {
    const decidedAt = new Date("2026-01-15T10:00:00.000Z");
    const decision = { advertising: true, decidedAt: decidedAt.toISOString() };

    expect(
      isConsentDecisionCurrent(decision, new Date("2026-07-15T09:59:59.000Z")),
    ).toBe(true);
    expect(
      isConsentDecisionCurrent(decision, new Date("2026-07-15T10:00:00.000Z")),
    ).toBe(false);
  });
});
