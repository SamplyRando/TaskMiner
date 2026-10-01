import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";

import { HeroSection } from "@/components/marketing/hero-section";
import { ProductPreview } from "@/components/marketing/product-preview";
import { HowItWorks } from "@/components/marketing/how-it-works";

describe("TaskMiner marketing product story", () => {
  it("describes the review-before-apply workflow in the hero", () => {
    render(
      <MemoryRouter>
        <HeroSection />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole("heading", {
        name: /Turn a project brief.*into reviewed work\./,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Edit the draft, choose what to keep, then apply it/),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "See the workflow" }),
    ).toHaveAttribute("href", "#demo");
  });

  it("makes human review explicit in the product workflow", () => {
    render(<HowItWorks />);

    expect(
      screen.getByRole("heading", { name: "Review the proposed plan" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Edit or discard the draft before it changes anything/),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        name: "Apply and coordinate the work",
      }),
    ).toBeInTheDocument();
  });

  it("keeps the product preview central without decorative floating cards", () => {
    const { container } = render(<ProductPreview />);

    expect(container.querySelector(".marketing-preview__window")).toBeVisible();
    expect(container.querySelector(".marketing-floating-widgets")).toBeNull();
    expect(
      screen.getByText(/dashboard preview showing project metrics/i),
    ).toBeInTheDocument();
  });
});
