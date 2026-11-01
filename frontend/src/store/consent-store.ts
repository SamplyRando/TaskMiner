import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export const CONSENT_STORAGE_KEY = "taskminer-consent";

/** The CNIL recommends keeping a choice, consent or refusal, for 6 months. */
export const CONSENT_VALIDITY_MONTHS = 6;

const MAX_CLOCK_SKEW_MS = 24 * 60 * 60 * 1000;

export type ConsentDecision = {
  /** Meta Pixel, used to measure TaskMiner's advertising campaigns. */
  advertising: boolean;
  decidedAt: string;
};

type ConsentState = {
  decision: ConsentDecision | null;
  isPanelOpen: boolean;
  closePanel: () => void;
  decide: (advertising: boolean) => void;
  openPanel: () => void;
};

export const isConsentDecisionCurrent = (
  decision: ConsentDecision,
  now = new Date(),
): boolean => {
  const decidedAt = new Date(decision.decidedAt);
  if (
    Number.isNaN(decidedAt.getTime()) ||
    decidedAt.getTime() > now.getTime() + MAX_CLOCK_SKEW_MS
  ) {
    return false;
  }
  const expiresAt = new Date(decidedAt);
  expiresAt.setUTCMonth(expiresAt.getUTCMonth() + CONSENT_VALIDITY_MONTHS);
  return now < expiresAt;
};

const readStoredDecision = (persisted: unknown): ConsentDecision | null => {
  if (typeof persisted !== "object" || persisted === null) return null;
  const { decision } = persisted as { decision?: unknown };
  if (typeof decision !== "object" || decision === null) return null;
  const { advertising, decidedAt } = decision as Record<string, unknown>;
  if (typeof advertising !== "boolean" || typeof decidedAt !== "string") {
    return null;
  }
  const storedDecision = { advertising, decidedAt };
  return isConsentDecisionCurrent(storedDecision) ? storedDecision : null;
};

/**
 * Cookie choices of the visitor, kept in this browser only. An expired,
 * malformed or outdated choice is dropped so that the banner asks again.
 */
export const useConsentStore = create<ConsentState>()(
  persist(
    (set) => ({
      decision: null,
      isPanelOpen: false,
      closePanel: () => {
        set({ isPanelOpen: false });
      },
      decide: (advertising) => {
        set({
          decision: { advertising, decidedAt: new Date().toISOString() },
          isPanelOpen: false,
        });
      },
      openPanel: () => {
        set({ isPanelOpen: true });
      },
    }),
    {
      merge: (persisted, current) => ({
        ...current,
        decision: readStoredDecision(persisted),
      }),
      // Bumping the version (new purpose or new vendor) asks everyone again.
      migrate: () => ({ decision: null }),
      name: CONSENT_STORAGE_KEY,
      partialize: ({ decision }) => ({ decision }),
      storage: createJSONStorage(() => localStorage),
      version: 1,
    },
  ),
);

export const selectHasAdvertisingConsent = (state: ConsentState): boolean =>
  state.decision?.advertising === true;
