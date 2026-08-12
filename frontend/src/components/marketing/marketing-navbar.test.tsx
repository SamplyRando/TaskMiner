import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";

import { MarketingNavbar } from "@/components/marketing/marketing-navbar";

describe("MarketingNavbar", () => {
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
});
