import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { ConsentBanner } from "@/features/consent/consent-banner";
import { ConsentSettingsButton } from "@/features/consent/consent-settings-button";
import { CONSENT_STORAGE_KEY, useConsentStore } from "@/store/consent-store";

const renderBanner = () =>
  render(
    <MemoryRouter>
      <ConsentBanner />
      <ConsentSettingsButton />
    </MemoryRouter>,
  );

const banner = () =>
  screen.queryByRole("region", { name: "Cookies publicitaires" });

describe("ConsentBanner", () => {
  beforeEach(() => {
    localStorage.clear();
    useConsentStore.setState({ decision: null, isPanelOpen: false });
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("asks before anything is sent, with refusal as easy as acceptance", () => {
    renderBanner();

    expect(banner()).toBeInTheDocument();
    expect(
      screen.getByText(/aucun de ces traceurs n’est chargé/),
    ).toBeInTheDocument();
    expect(screen.getByText(/LinkedIn Insight Tag/)).toBeInTheDocument();
    const refuse = screen.getByRole("button", { name: "Refuser" });
    const accept = screen.getByRole("button", { name: "Accepter" });
    expect(refuse.className).toBe(accept.className);
    expect(screen.queryByRole("button", { name: "Fermer" })).toBeNull();
    expect(
      screen.getByRole("link", { name: "En savoir plus" }),
    ).toHaveAttribute("href", "/privacy#cookies");
  });

  it("records a refusal and stops asking", async () => {
    const user = userEvent.setup();
    renderBanner();

    await user.click(screen.getByRole("button", { name: "Refuser" }));

    expect(banner()).toBeNull();
    expect(useConsentStore.getState().decision?.advertising).toBe(false);
    expect(screen.getByRole("status")).toHaveTextContent(
      "Cookies publicitaires refusés.",
    );
  });

  it("records an acceptance", async () => {
    const user = userEvent.setup();
    renderBanner();

    await user.click(screen.getByRole("button", { name: "Accepter" }));

    expect(banner()).toBeNull();
    expect(useConsentStore.getState().decision?.advertising).toBe(true);
  });

  it("reopens on request to withdraw consent, then gives focus back", async () => {
    const user = userEvent.setup();
    useConsentStore.setState({
      decision: { advertising: true, decidedAt: "2026-10-30T09:00:00.000Z" },
    });
    renderBanner();
    expect(banner()).toBeNull();

    const settings = screen.getByRole("button", {
      name: "Gestion des cookies",
    });
    await user.click(settings);

    expect(banner()).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Cookies publicitaires" }),
    ).toHaveFocus();
    expect(screen.getByText("accepté")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Refuser" }));

    expect(banner()).toBeNull();
    expect(useConsentStore.getState().decision?.advertising).toBe(false);
    expect(settings).toHaveFocus();
  });

  it("closes without changing the choice with Escape or the close button", async () => {
    const user = userEvent.setup();
    const decision = {
      advertising: false,
      decidedAt: "2026-10-30T09:00:00.000Z",
    };
    useConsentStore.setState({ decision });
    renderBanner();
    const settings = screen.getByRole("button", {
      name: "Gestion des cookies",
    });

    await user.click(settings);
    await user.keyboard("{Escape}");
    expect(banner()).toBeNull();
    expect(settings).toHaveFocus();

    await user.click(settings);
    await user.click(screen.getByRole("button", { name: "Fermer" }));
    expect(banner()).toBeNull();
    expect(useConsentStore.getState().decision).toEqual(decision);
  });

  it("applies a choice made in another tab", async () => {
    renderBanner();
    expect(banner()).toBeInTheDocument();

    localStorage.setItem(
      CONSENT_STORAGE_KEY,
      JSON.stringify({
        state: {
          decision: { advertising: false, decidedAt: new Date().toISOString() },
        },
        version: 2,
      }),
    );
    await act(async () => {
      window.dispatchEvent(
        new StorageEvent("storage", { key: CONSENT_STORAGE_KEY }),
      );
      await Promise.resolve();
    });

    expect(banner()).toBeNull();
    expect(useConsentStore.getState().decision?.advertising).toBe(false);
  });
});
