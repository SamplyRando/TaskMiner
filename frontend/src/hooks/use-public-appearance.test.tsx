import { renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { usePublicAppearance } from "@/hooks/use-public-appearance";

const mockSystemTheme = (dark: boolean) => {
  vi.spyOn(window, "matchMedia").mockImplementation(
    (query) =>
      ({
        addEventListener: () => undefined,
        addListener: () => undefined,
        dispatchEvent: () => false,
        matches: dark && query === "(prefers-color-scheme: dark)",
        media: query,
        onchange: null,
        removeEventListener: () => undefined,
        removeListener: () => undefined,
      }) as MediaQueryList,
  );
};

describe("usePublicAppearance", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    const root = document.documentElement;
    root.classList.remove("dark", "reduce-motion");
    delete root.dataset.accent;
  });

  it("follows the visitor's system theme with the brand accent", () => {
    mockSystemTheme(true);

    renderHook(() => {
      usePublicAppearance();
    });

    expect(document.documentElement).toHaveClass("dark");
    expect(document.documentElement.dataset.accent).toBe("violet");
  });

  it("clears a theme and an accent left by a previous session", () => {
    mockSystemTheme(false);
    const root = document.documentElement;
    root.classList.add("dark");
    root.dataset.accent = "orange";

    renderHook(() => {
      usePublicAppearance();
    });

    expect(root).not.toHaveClass("dark");
    expect(root.dataset.accent).toBe("violet");
  });

  it("keeps an existing reduced-motion choice", () => {
    mockSystemTheme(false);
    document.documentElement.classList.add("reduce-motion");

    renderHook(() => {
      usePublicAppearance();
    });

    expect(document.documentElement).toHaveClass("reduce-motion");
  });
});
