import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { faqItems } from "@/components/marketing/faq-items";
import { FaqSection } from "@/components/marketing/faq-section";

describe("FaqSection", () => {
  it("renders every question as a native, keyboard-accessible disclosure", () => {
    const { container } = render(<FaqSection />);

    const disclosures = container.querySelectorAll("details");
    expect(disclosures).toHaveLength(faqItems.length);
    disclosures.forEach((disclosure) => {
      expect(disclosure.querySelector("summary")).not.toBeNull();
      expect(disclosure).not.toHaveAttribute("open");
    });
  });

  it("expands an answer when its question is activated", async () => {
    const user = userEvent.setup();
    const { container } = render(<FaqSection />);
    const [first] = Array.from(container.querySelectorAll("details"));

    await user.click(
      screen.getByText(
        "TaskMiner AI peut-il créer des tâches sans mon accord ?",
      ),
    );

    expect(first).toHaveAttribute("open");
    expect(first?.textContent).toContain("Appliquer le plan");
  });

  it("offers the real contact address", () => {
    render(<FaqSection />);

    expect(
      screen.getByRole("link", { name: "hello@taskminer.app" }),
    ).toHaveAttribute("href", "mailto:hello@taskminer.app");
  });
});
