import { render, renderHook, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import { BrandLogo } from "@/components/brand-logo";
import { SkipLink } from "@/components/skip-link";
import { useDocumentTitle } from "@/hooks/use-document-title";

describe("product branding", () => {
  it("renders an accessible brand link", () => {
    render(
      <MemoryRouter>
        <BrandLogo />
      </MemoryRouter>,
    );
    expect(
      screen.getByRole("link", { name: "TaskMiner — Accueil" }),
    ).toHaveAttribute("href", "/app");
  });

  it("offers a keyboard skip link to the main content", () => {
    render(<SkipLink />);
    expect(
      screen.getByRole("link", { name: "Aller au contenu principal" }),
    ).toHaveAttribute("href", "#main-content");
  });

  it("keeps browser titles consistently branded", () => {
    renderHook(() => {
      useDocumentTitle("Projets");
    });
    expect(document.title).toBe("Projets · TaskMiner");
  });
});
