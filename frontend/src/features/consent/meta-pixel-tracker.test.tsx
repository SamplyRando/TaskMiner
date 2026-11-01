import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Link, MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { MetaPixelTracker } from "@/features/consent/meta-pixel-tracker";
import { metaPixel } from "@/lib/meta-pixel";
import { useConsentStore } from "@/store/consent-store";

vi.mock("@/lib/meta-pixel", () => ({
  metaPixel: { track: vi.fn(), trackPageView: vi.fn(), update: vi.fn() },
}));

const mockedUpdate = vi.mocked(metaPixel.update);
const mockedTrackPageView = vi.mocked(metaPixel.trackPageView);

const renderTracker = () =>
  render(
    <MemoryRouter initialEntries={["/"]}>
      <MetaPixelTracker />
      <Link to="/register?plan=pro">Inscription</Link>
      <Link to="/register?plan=pro#formulaire">Formulaire</Link>
    </MemoryRouter>,
  );

describe("MetaPixelTracker", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useConsentStore.setState({ decision: null, isPanelOpen: false });
  });

  it("keeps the pixel off until the visitor accepts", () => {
    renderTracker();

    expect(mockedUpdate).toHaveBeenLastCalledWith(false);
  });

  it("applies consent and tracks the current page when the visitor accepts", () => {
    renderTracker();

    act(() => {
      useConsentStore.getState().decide(true);
    });

    expect(mockedUpdate).toHaveBeenLastCalledWith(true);
    expect(mockedTrackPageView).toHaveBeenLastCalledWith("/");
  });

  it("tracks client-side navigations but not anchors", async () => {
    const user = userEvent.setup();
    useConsentStore.setState({
      decision: { advertising: true, decidedAt: new Date().toISOString() },
    });
    renderTracker();
    expect(mockedTrackPageView).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole("link", { name: "Inscription" }));
    await user.click(screen.getByRole("link", { name: "Formulaire" }));

    expect(mockedTrackPageView.mock.calls).toEqual([
      ["/"],
      ["/register?plan=pro"],
    ]);
    // Consent is applied to each page before its PageView.
    expect(mockedUpdate.mock.invocationCallOrder[1]).toBeLessThan(
      mockedTrackPageView.mock.invocationCallOrder[1] ?? 0,
    );
  });

  it("applies a withdrawal immediately", () => {
    useConsentStore.setState({
      decision: { advertising: true, decidedAt: new Date().toISOString() },
    });
    renderTracker();

    act(() => {
      useConsentStore.getState().decide(false);
    });

    expect(mockedUpdate).toHaveBeenLastCalledWith(false);
  });
});
