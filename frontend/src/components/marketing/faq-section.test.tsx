import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { FaqSection } from "@/components/marketing/faq-section";
import "@/styles/marketing.css";

function renderFaq() {
  return render(
    <div className="marketing-shell marketing-motion-ready">
      <FaqSection />
    </div>,
  );
}

function getFaqItems() {
  return Array.from(
    screen
      .getByTestId("faq-list")
      .querySelectorAll<HTMLElement>(".marketing-faq__item"),
  );
}

function expectStableItem(item: HTMLElement) {
  const styles = window.getComputedStyle(item);

  expect(item).not.toHaveAttribute("data-marketing-reveal");
  expect(item).not.toHaveClass("marketing-motion-reveal");
  expect(styles.display).toBe("block");
  expect(styles.visibility).toBe("visible");
  expect(styles.opacity).toBe("1");
  expect(styles.scale).toBe("1");
  expect(styles.transform).toBe("none");
  expect(styles.translate).toBe("0 0");
}

function expectSameFaqNodes(list: HTMLElement, items: HTMLElement[]) {
  expect(screen.getByTestId("faq-list")).toBe(list);
  getFaqItems().forEach((item, index) => {
    expect(item).toBe(items[index]);
    expectStableItem(item);
  });
}

describe("FaqSection interaction lifecycle", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("keeps every FAQ item mounted and outside the global reveal lifecycle", () => {
    renderFaq();

    const items = getFaqItems();

    expect(items).toHaveLength(8);
    items.forEach(expectStableItem);
  });

  it("only expands the selected answer without replacing or hiding the list", async () => {
    const user = userEvent.setup();
    renderFaq();
    const list = screen.getByTestId("faq-list");
    const items = getFaqItems();
    const firstQuestion = screen.getByRole("button", {
      name: "What is TaskMiner?",
    });
    const secondQuestion = screen.getByRole("button", {
      name: "Who is TaskMiner for?",
    });

    expect(firstQuestion).toHaveAttribute("aria-expanded", "true");
    expect(secondQuestion).toHaveAttribute("aria-expanded", "false");

    await user.click(secondQuestion);

    expect(firstQuestion).toHaveAttribute("aria-expanded", "false");
    expect(secondQuestion).toHaveAttribute("aria-expanded", "true");
    expectSameFaqNodes(list, items);
  });

  it("remains stable through repeated open and close interactions", async () => {
    const user = userEvent.setup();
    renderFaq();
    const list = screen.getByTestId("faq-list");
    const items = getFaqItems();
    const questions = screen.getAllByRole("button");

    for (const question of questions) {
      await user.click(question);
      expectSameFaqNodes(list, items);
      await user.click(question);
      expectSameFaqNodes(list, items);
    }
  });

  it("does not reset or hide items across viewport-like scroll changes", () => {
    renderFaq();
    const list = screen.getByTestId("faq-list");
    const items = getFaqItems();

    fireEvent.scroll(window, { target: { scrollY: 2400 } });
    fireEvent.scroll(window, { target: { scrollY: 0 } });

    expectSameFaqNodes(list, items);
    expect(
      screen.getByRole("button", { name: "What is TaskMiner?" }),
    ).toHaveAttribute("aria-expanded", "true");
  });

  it("keeps the complete FAQ visible with reduced motion", () => {
    vi.spyOn(window, "matchMedia").mockImplementation(
      (query) =>
        ({
          addEventListener: () => undefined,
          addListener: () => undefined,
          dispatchEvent: () => false,
          matches: query === "(prefers-reduced-motion: reduce)",
          media: query,
          onchange: null,
          removeEventListener: () => undefined,
          removeListener: () => undefined,
        }) as MediaQueryList,
    );

    renderFaq();

    getFaqItems().forEach(expectStableItem);
    expect(
      screen.getByRole("button", { name: "What is TaskMiner?" }),
    ).toHaveAttribute("aria-expanded", "true");
  });
});
