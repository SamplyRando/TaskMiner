import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { CSSProperties } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { MarketingAnchorNavigation } from "@/components/marketing/marketing-anchor-navigation";
import { ACTIVE_SECTION_EVENT } from "@/components/marketing/use-active-marketing-section";

const scrollToMock = vi.fn();

function AnchorFixture() {
  return (
    <div
      className="marketing-shell"
      style={{ "--marketing-anchor-gap": "32px" } as CSSProperties}
    >
      <MarketingAnchorNavigation />
      <nav className="marketing-nav" />
      <a href="#features">Features</a>
      <section id="features">
        <h2 data-marketing-anchor-target tabIndex={-1}>
          Everything your team needs.
        </h2>
      </section>
      <section id="pricing">
        <h2 data-marketing-anchor-target tabIndex={-1}>
          Start with the full product.
        </h2>
      </section>
    </div>
  );
}

function setMeasuredPositions(target: HTMLElement) {
  const navbar = document.querySelector<HTMLElement>(".marketing-nav");
  Object.defineProperty(target, "offsetTop", {
    configurable: true,
    value: 500,
  });
  if (navbar) {
    navbar.getBoundingClientRect = () => ({ bottom: 72 }) as DOMRect;
  }
}

describe("MarketingAnchorNavigation", () => {
  beforeEach(() => {
    window.history.replaceState(null, "", "/");
    Object.defineProperty(window, "scrollTo", {
      configurable: true,
      value: scrollToMock,
    });
    scrollToMock.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    window.history.replaceState(null, "", "/");
  });

  it("updates the hash and positions the section heading below the navbar", async () => {
    const user = userEvent.setup();
    const activeSectionListener = vi.fn();
    window.addEventListener(ACTIVE_SECTION_EVENT, activeSectionListener);
    render(<AnchorFixture />);
    setMeasuredPositions(screen.getByRole("heading", { name: /everything/i }));

    await user.click(screen.getByRole("link", { name: "Features" }));

    await waitFor(() => {
      expect(window.location.hash).toBe("#features");
      expect(scrollToMock).toHaveBeenLastCalledWith({
        behavior: "smooth",
        left: 0,
        top: 396,
      });
    });
    expect(activeSectionListener).toHaveBeenCalled();
    window.removeEventListener(ACTIVE_SECTION_EVENT, activeSectionListener);
  });

  it("positions a direct hash load without animated scrolling", async () => {
    window.history.replaceState(null, "", "/#pricing");
    render(<AnchorFixture />);
    setMeasuredPositions(
      screen.getByRole("heading", { name: /start with the full product/i }),
    );

    await waitFor(() => {
      expect(scrollToMock).toHaveBeenLastCalledWith({
        behavior: "auto",
        left: 0,
        top: 396,
      });
    });
  });

  it("uses immediate positioning when reduced motion is enabled", async () => {
    vi.spyOn(window, "matchMedia").mockImplementation(
      (query) =>
        ({
          addEventListener: () => undefined,
          addListener: () => undefined,
          dispatchEvent: () => false,
          matches: query === "(prefers-reduced-motion: reduce)",
          media: query,
          onchange: null,
          removeEventListener: () => undefined,
          removeListener: () => undefined,
        }) as MediaQueryList,
    );
    const user = userEvent.setup();
    render(<AnchorFixture />);
    setMeasuredPositions(screen.getByRole("heading", { name: /everything/i }));

    await user.click(screen.getByRole("link", { name: "Features" }));

    await waitFor(() => {
      expect(scrollToMock).toHaveBeenLastCalledWith({
        behavior: "auto",
        left: 0,
        top: 396,
      });
    });
  });

  it("repositions the destination after browser history navigation", async () => {
    render(<AnchorFixture />);
    setMeasuredPositions(
      screen.getByRole("heading", { name: /start with the full product/i }),
    );
    window.history.replaceState(null, "", "/#pricing");
    window.dispatchEvent(new PopStateEvent("popstate"));

    await waitFor(() => {
      expect(scrollToMock).toHaveBeenLastCalledWith({
        behavior: "smooth",
        left: 0,
        top: 396,
      });
    });
  });

  it("keeps a visible hash destination aligned after a resize", async () => {
    window.history.replaceState(null, "", "/#features");
    render(<AnchorFixture />);
    const target = screen.getByRole("heading", { name: /everything/i });
    const section = document.getElementById("features");
    setMeasuredPositions(target);
    if (section) {
      section.getBoundingClientRect = () =>
        ({ bottom: 900, top: 100 }) as DOMRect;
    }

    await waitFor(() => {
      expect(scrollToMock).toHaveBeenCalled();
    });
    scrollToMock.mockClear();
    window.dispatchEvent(new Event("resize"));

    await waitFor(() => {
      expect(scrollToMock).toHaveBeenLastCalledWith({
        behavior: "auto",
        left: 0,
        top: 396,
      });
    });
  });
});
