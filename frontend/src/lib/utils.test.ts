import { describe, expect, it } from "vitest";

import { cn } from "@/lib/utils";

describe("cn with the Facette design tokens", () => {
  it("keeps role-based font sizes next to text colours", () => {
    expect(cn("text-page-title", "text-muted-foreground")).toBe(
      "text-page-title text-muted-foreground",
    );
  });

  it("lets a later font size replace a role-based one", () => {
    expect(cn("text-card-title", "text-base")).toBe("text-base");
  });

  it("resolves control heights, radii and elevations like core utilities", () => {
    expect(cn("h-control", "h-8")).toBe("h-8");
    expect(cn("rounded-control", "rounded-full")).toBe("rounded-full");
    expect(cn("shadow-control", "shadow-none")).toBe("shadow-none");
  });

  it("keeps variant-scoped touch targets alongside explicit heights", () => {
    expect(cn("h-control pointer-coarse:min-h-control-lg", "h-auto")).toBe(
      "pointer-coarse:min-h-control-lg h-auto",
    );
  });
});
