import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import { Sidebar } from "@/layouts/sidebar";
import { useConsentStore } from "@/store/consent-store";

describe("Sidebar TaskMiner AI navigation", () => {
  it("keeps the cookie choices reachable from every app page", async () => {
    const user = userEvent.setup();
    useConsentStore.setState({ isPanelOpen: false });
    render(
      <MemoryRouter>
        <Sidebar isOpen onClose={vi.fn()} />
      </MemoryRouter>,
    );

    await user.click(screen.getByRole("button", { name: "Cookies" }));

    expect(useConsentStore.getState().isPanelOpen).toBe(true);
  });

  it("exposes the authenticated TaskMiner AI entry point", () => {
    render(
      <MemoryRouter>
        <Sidebar isOpen onClose={vi.fn()} />
      </MemoryRouter>,
    );

    expect(screen.getByRole("link", { name: "TaskMiner AI" })).toHaveAttribute(
      "href",
      "/app/ai",
    );
  });

  it("locks background scroll and restores focus for the mobile drawer", async () => {
    const user = userEvent.setup();
    const trigger = document.createElement("button");
    document.body.append(trigger);
    trigger.focus();
    const onClose = vi.fn();

    const { rerender } = render(
      <MemoryRouter>
        <Sidebar isOpen onClose={onClose} />
      </MemoryRouter>,
    );

    expect(document.body.style.overflow).toBe("hidden");
    expect(
      screen.getByRole("button", { name: "Fermer le menu" }),
    ).toHaveFocus();

    await user.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledOnce();

    rerender(
      <MemoryRouter>
        <Sidebar isOpen={false} onClose={onClose} />
      </MemoryRouter>,
    );

    expect(document.body.style.overflow).toBe("");
    expect(trigger).toHaveFocus();
    trigger.remove();
  });
});
