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
import { ACTIVE_SECTION_EVENT } from "@/components/marketing/use-active-marketing-section";

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

    const menuButton = screen.getByRole("button", { name: "Ouvrir le menu" });
    const mobileMenu = document.getElementById("marketing-mobile-menu");

    expect(mobileMenu).toHaveAttribute("aria-hidden", "true");

    await user.click(menuButton);

    await waitFor(() => {
      expect(
        screen.getAllByRole("link", { name: "Fonctionnement" })[1],
      ).toHaveFocus();
    });
    expect(document.body.style.overflow).toBe("hidden");
    expect(mobileMenu).toHaveAttribute("aria-hidden", "false");

    // The close button belongs to the trap, so the menu can be dismissed
    // from the keyboard without Escape.
    const closeButton = screen.getByRole("button", { name: "Fermer le menu" });
    await user.keyboard("{Shift>}{Tab}{/Shift}");
    expect(closeButton).toHaveFocus();
    await user.keyboard("{Shift>}{Tab}{/Shift}");
    expect(
      screen.getAllByRole("link", { name: "Commencer gratuitement" })[1],
    ).toHaveFocus();
    await user.tab();
    expect(closeButton).toHaveFocus();
    await user.tab();
    expect(
      screen.getAllByRole("link", { name: "Fonctionnement" })[1],
    ).toHaveFocus();

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

  it("links only to real anchors and public routes", () => {
    render(
      <MemoryRouter>
        <MarketingNavbar />
      </MemoryRouter>,
    );

    const [desktopHome] = screen.getAllByRole("link", {
      name: "TaskMiner — Accueil",
    });
    expect(desktopHome).toHaveAttribute("href", "/");
    for (const [name, href] of [
      ["Fonctionnement", "#fonctionnement"],
      ["Produit", "#produit"],
      ["Tarifs", "#tarifs"],
      ["Se connecter", "/login"],
      ["Commencer gratuitement", "/register"],
    ] as const) {
      // hidden: true also covers the closed (inert) mobile menu.
      for (const link of screen.getAllByRole("link", { hidden: true, name })) {
        expect(link).toHaveAttribute("href", href);
      }
    }
    expect(
      screen.getByRole("navigation", { name: "Navigation principale" }),
    ).toBeInTheDocument();
  });

  it("clears the current section when an anchor outside the navigation is reached", () => {
    render(
      <MemoryRouter>
        <MarketingNavbar />
      </MemoryRouter>,
    );
    const [tarifs] = screen.getAllByRole("link", { name: "Tarifs" });

    act(() => {
      window.dispatchEvent(
        new CustomEvent(ACTIVE_SECTION_EVENT, { detail: "tarifs" }),
      );
    });
    expect(tarifs).toHaveAttribute("aria-current", "location");

    act(() => {
      window.dispatchEvent(
        new CustomEvent(ACTIVE_SECTION_EVENT, { detail: null }),
      );
    });
    expect(tarifs).not.toHaveAttribute("aria-current");
  });

  it("closes the mobile menu when the desktop layout is reached", async () => {
    let notifyChange: (() => void) | undefined;
    let desktop = false;
    vi.spyOn(window, "matchMedia").mockImplementation(
      (query) =>
        ({
          addEventListener: (_type: string, listener: () => void) => {
            if (query === "(min-width: 64rem)") notifyChange = listener;
          },
          addListener: () => undefined,
          dispatchEvent: () => false,
          get matches() {
            return query === "(min-width: 64rem)" && desktop;
          },
          media: query,
          onchange: null,
          removeEventListener: () => undefined,
          removeListener: () => undefined,
        }) as unknown as MediaQueryList,
    );
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <MarketingNavbar />
      </MemoryRouter>,
    );

    await user.click(screen.getByRole("button", { name: "Ouvrir le menu" }));
    expect(document.body.style.overflow).toBe("hidden");

    desktop = true;
    act(() => {
      notifyChange?.();
    });

    expect(document.getElementById("marketing-mobile-menu")).toHaveAttribute(
      "aria-hidden",
      "true",
    );
    expect(document.body.style.overflow).toBe("");
  });
});
