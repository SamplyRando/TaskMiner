import { act, render } from "@testing-library/react";
import { Link, MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { LinkedInInsightTracker } from "@/features/consent/linkedin-insight-tracker";
import { MetaPixelTracker } from "@/features/consent/meta-pixel-tracker";
import { linkedInInsightTag } from "@/lib/linkedin-insight";
import { metaPixel } from "@/lib/meta-pixel";
import { useConsentStore } from "@/store/consent-store";

vi.mock("@/lib/linkedin-insight", () => ({
  linkedInInsightTag: { update: vi.fn() },
}));
vi.mock("@/lib/meta-pixel", () => ({
  metaPixel: { track: vi.fn(), trackPageView: vi.fn(), update: vi.fn() },
}));

const mockedLinkedInUpdate = vi.mocked(linkedInInsightTag.update);
const mockedMetaUpdate = vi.mocked(metaPixel.update);

const renderTrackers = (initialEntry = "/") =>
  render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <MetaPixelTracker />
      <LinkedInInsightTracker />
      <Link to="/privacy">Confidentialité</Link>
    </MemoryRouter>,
  );

describe("LinkedInInsightTracker", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useConsentStore.setState({ decision: null, isPanelOpen: false });
  });

  it("keeps LinkedIn off on a first visit without consent", () => {
    renderTrackers();

    expect(mockedLinkedInUpdate).toHaveBeenLastCalledWith(false);
  });

  it("enables Meta and LinkedIn from the same explicit marketing choice", () => {
    renderTrackers();

    act(() => {
      useConsentStore.getState().decide(true);
    });

    expect(mockedMetaUpdate).toHaveBeenLastCalledWith(true);
    expect(mockedLinkedInUpdate).toHaveBeenLastCalledWith(true);
  });

  it("applies a refusal and a later withdrawal to LinkedIn immediately", () => {
    renderTrackers();
    act(() => {
      useConsentStore.getState().decide(false);
    });
    expect(mockedLinkedInUpdate).toHaveBeenLastCalledWith(false);

    act(() => {
      useConsentStore.getState().decide(true);
      useConsentStore.getState().decide(false);
    });
    expect(mockedLinkedInUpdate).toHaveBeenLastCalledWith(false);
  });

  it("restores a stored marketing consent on page load", () => {
    useConsentStore.setState({
      decision: { advertising: true, decidedAt: new Date().toISOString() },
    });

    renderTrackers("/privacy");

    expect(mockedLinkedInUpdate).toHaveBeenLastCalledWith(true);
  });
});
