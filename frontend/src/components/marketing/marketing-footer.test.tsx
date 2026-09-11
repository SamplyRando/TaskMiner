import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";

import { MarketingFooter } from "@/components/marketing/marketing-footer";

describe("MarketingFooter", () => {
  it("links to the public privacy policy", () => {
    render(
      <MemoryRouter>
        <MarketingFooter />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole("link", { name: "Confidentialité" }),
    ).toHaveAttribute("href", "/privacy");
  });
});
