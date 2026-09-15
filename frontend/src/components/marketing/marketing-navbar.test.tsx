import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import { MarketingNavbar } from "@/components/marketing/marketing-navbar";

describe("MarketingNavbar", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    Object.defineProperty(window, "scrollY", {
      configurable: true,
      value: 0,
    });
  });

  it("manages focus and page scrolling while the mobile menu is open", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <MarketingNavbar />
      </MemoryRouter>,
    );

    const menuButton = screen.getByRole("button", { name: "Open navigation" });
    const mobileMenu = document.getElementById("marketing-mobile-menu");

    expect(mobileMenu).toHaveAttribute("aria-hidden", "true");

    await user.click(menuButton);

    await waitFor(() => {
      expect(
        screen.getAllByRole("link", { name: "Features" })[1],
      ).toHaveFocus();
    });
    expect(document.body.style.overflow).toBe("hidden");
    expect(mobileMenu).toHaveAttribute("aria-hidden", "false");

    await user.keyboard("{Shift>}{Tab}{/Shift}");
    expect(
      screen.getAllByRole("link", { name: "Start free" })[1],
    ).toHaveFocus();
    await user.tab();
    expect(screen.getAllByRole("link", { name: "Features" })[1]).toHaveFocus();

    await user.keyboard("{Escape}");

    expect(menuButton).toHaveFocus();
    expect(document.body.style.overflow).toBe("");
    expect(mobileMenu).toHaveAttribute("aria-hidden", "true");
  });

  it("coalesces scroll events into one visual update per frame", () => {
    let scheduledCallback: FrameRequestCallback | null = null;
    const requestFrame = vi
      .spyOn(window, "requestAnimationFrame")
      .mockImplementation((callback) => {
        scheduledCallback = callback;
        return 42;
      });
    vi.spyOn(window, "cancelAnimationFrame").mockImplementation(
      () => undefined,
    );
    Object.defineProperty(window, "scrollY", {
      configurable: true,
      value: 0,
    });

    const { container } = render(
      <MemoryRouter>
        <MarketingNavbar />
      </MemoryRouter>,
    );
    const navbar = container.querySelector(".marketing-navbar");
    expect(navbar).not.toHaveClass("marketing-navbar--scrolled");

    Object.defineProperty(window, "scrollY", {
      configurable: true,
      value: 24,
    });
    fireEvent.scroll(window);
    fireEvent.scroll(window);
    fireEvent.scroll(window);

    expect(requestFrame).toHaveBeenCalledTimes(1);
    act(() => {
      scheduledCallback?.(0);
    });
    expect(navbar).toHaveClass("marketing-navbar--scrolled");
  });
});
