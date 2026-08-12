import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AiDemoSection } from "@/components/marketing/ai-demo-section";
import "@/styles/marketing.css";

let intersectionCallback: IntersectionObserverCallback;

const stageDelays = [
  400, 400, 400, 100, 300, 100, 300, 100, 300, 100, 400, 300, 225, 225, 225,
  225, 200, 250, 250, 250, 150,
] as const;

class IntersectionObserverMock implements IntersectionObserver {
  readonly root = null;
  readonly rootMargin = "120px 0px";
  readonly thresholds = [0.08];

  constructor(callback: IntersectionObserverCallback) {
    intersectionCallback = callback;
  }

  disconnect = vi.fn();
  observe = vi.fn();
  takeRecords = vi.fn(() => []);
  unobserve = vi.fn();
}

function setDemoVisibility(isIntersecting: boolean) {
  act(() => {
    intersectionCallback(
      [{ isIntersecting } as IntersectionObserverEntry],
      {} as IntersectionObserver,
    );
  });
}

function advanceStages(count: number) {
  stageDelays.slice(0, count).forEach((delay) => {
    act(() => {
      vi.advanceTimersByTime(delay);
    });
  });
}

function getDemoCard() {
  return screen.getByTestId("ai-demo-panel");
}

function getDemoStage(container: HTMLElement) {
  const stage = container.querySelector<HTMLElement>(
    ".marketing-ai-demo__stage",
  );
  if (!stage) throw new Error("AI demo stage was not rendered");
  return stage;
}

function getRenderedTasks(container: HTMLElement) {
  return container.querySelectorAll(".marketing-ai-tasks li");
}

function getRequiredElement(container: HTMLElement, selector: string) {
  const element = container.querySelector<HTMLElement>(selector);
  if (!element) throw new Error(`${selector} was not rendered`);
  return element;
}

function expectStablePanel(panel: HTMLElement) {
  const styles = window.getComputedStyle(panel);

  expect(panel).not.toHaveAttribute("data-marketing-reveal");
  expect(panel).not.toHaveClass("marketing-motion-reveal");
  expect(styles.display).not.toBe("none");
  expect(styles.visibility).toBe("visible");
  expect(styles.opacity).toBe("1");
  expect(styles.scale).toBe("1");
  expect(styles.transform).toBe("none");
  expect(styles.translate).toBe("0 0");
  expect(styles.width).toBe("100%");
}

describe("AiDemoSection viewport lifecycle", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal("IntersectionObserver", IntersectionObserverMock);
    document.body.classList.add("marketing-motion-ready");
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    document.body.classList.remove("marketing-motion-ready");
  });

  it("keeps the root panel outside the global reveal lifecycle", () => {
    render(<AiDemoSection />);
    const panel = getDemoCard();

    expect(panel).toBeInTheDocument();
    expectStablePanel(panel);
  });

  it("uses React stages to progressively render meaningful content", () => {
    const { container } = render(<AiDemoSection />);
    const card = getDemoCard();

    expectStablePanel(card);
    setDemoVisibility(true);
    expect(card).toHaveAttribute("data-demo-state", "active");
    expect(getDemoStage(container)).toHaveAttribute("data-demo-stage", "0");
    expect(getRenderedTasks(container)).toHaveLength(0);

    advanceStages(2);

    expect(getDemoStage(container)).toHaveAttribute("data-demo-stage", "800");
    expect(getRenderedTasks(container)).toHaveLength(1);
    expect(screen.getByText("Design homepage")).toBeInTheDocument();
    expect(screen.getByText("Analyzing...")).toBeInTheDocument();
  });

  it("preserves visible content and the current stage when paused", () => {
    const { container } = render(<AiDemoSection />);
    setDemoVisibility(true);
    advanceStages(stageDelays.length);

    const card = getDemoCard();
    const panel = card;
    const stage = getDemoStage(container);
    const firstTask = getRequiredElement(container, ".marketing-ai-tasks li");
    const timeline = getRequiredElement(container, ".marketing-ai-timeline");
    const summary = getRequiredElement(container, ".marketing-ai-summary");

    fireEvent.click(
      screen.getByRole("button", { name: "Pause AI demonstration" }),
    );
    act(() => {
      vi.advanceTimersByTime(10_000);
    });

    expect(card).toHaveAttribute("data-demo-state", "paused");
    expect(getDemoCard()).toBe(panel);
    expectStablePanel(panel);
    expect(getDemoStage(container)).toBe(stage);
    expect(getDemoStage(container)).toHaveAttribute("data-demo-stage", "5200");
    expect(getRenderedTasks(container)).toHaveLength(5);
    expect(window.getComputedStyle(firstTask).opacity).toBe("1");
    expect(window.getComputedStyle(timeline).opacity).toBe("1");
    expect(window.getComputedStyle(summary).opacity).toBe("1");
    expect(screen.getByText("Ready to start.")).toBeInTheDocument();
  });

  it("preserves its stage offscreen and continues after re-entry", () => {
    const { container } = render(<AiDemoSection />);
    setDemoVisibility(true);
    advanceStages(10);
    const panel = getDemoCard();
    const stage = getDemoStage(container);

    expect(stage).toHaveAttribute("data-demo-stage", "2500");
    expect(getRenderedTasks(container)).toHaveLength(5);

    setDemoVisibility(false);
    act(() => {
      vi.advanceTimersByTime(10_000);
    });
    expect(getDemoStage(container)).toBe(stage);
    expect(getDemoCard()).toBe(panel);
    expectStablePanel(panel);
    expect(stage).toHaveAttribute("data-demo-stage", "2500");

    setDemoVisibility(true);
    act(() => {
      vi.advanceTimersByTime(400);
    });

    expect(getDemoStage(container)).toBe(stage);
    expect(getDemoCard()).toBe(panel);
    expectStablePanel(panel);
    expect(stage).toHaveAttribute("data-demo-stage", "2900");
    expect(screen.getAllByText(/Urgent|High|Medium/)).toHaveLength(5);
  });

  it("keeps the same rendered state through repeated viewport transitions", () => {
    const { container } = render(<AiDemoSection />);
    setDemoVisibility(true);
    advanceStages(12);
    const panel = getDemoCard();
    const stage = getDemoStage(container);
    const stageValue = stage.dataset.demoStage;

    for (let transition = 0; transition < 5; transition += 1) {
      setDemoVisibility(false);
      setDemoVisibility(true);
      expect(getDemoCard()).toBe(panel);
      expectStablePanel(panel);
    }

    expect(getDemoStage(container)).toBe(stage);
    expect(stage.dataset.demoStage).toBe(stageValue);
    expect(getRenderedTasks(container)).toHaveLength(5);
    expect(screen.getByText("Timeline")).toBeInTheDocument();
  });

  it("keeps a paused state intact while leaving and re-entering", () => {
    const { container } = render(<AiDemoSection />);
    setDemoVisibility(true);
    advanceStages(12);
    fireEvent.click(
      screen.getByRole("button", { name: "Pause AI demonstration" }),
    );
    const panel = getDemoCard();
    const stage = getDemoStage(container);

    setDemoVisibility(false);
    setDemoVisibility(true);

    expect(getDemoCard()).toHaveAttribute("data-demo-state", "paused");
    expect(getDemoCard()).toBe(panel);
    expectStablePanel(panel);
    expect(getDemoStage(container)).toBe(stage);
    expect(screen.getByText("Timeline")).toBeInTheDocument();
  });

  it("resumes progression without resetting the current stage", () => {
    const { container } = render(<AiDemoSection />);
    setDemoVisibility(true);
    advanceStages(9);
    const panel = getDemoCard();
    const stage = getDemoStage(container);

    fireEvent.click(
      screen.getByRole("button", { name: "Pause AI demonstration" }),
    );
    expect(stage).toHaveAttribute("data-demo-stage", "2400");

    fireEvent.click(
      screen.getByRole("button", { name: "Resume AI demonstration" }),
    );
    expect(getDemoCard()).toBe(panel);
    expectStablePanel(panel);
    expect(getDemoStage(container)).toBe(stage);
    act(() => {
      vi.advanceTimersByTime(100);
    });

    expect(getDemoStage(container)).toBe(stage);
    expect(stage).toHaveAttribute("data-demo-stage", "2500");
  });

  it("resets the sequence only when replay is requested", () => {
    const { container } = render(<AiDemoSection />);
    setDemoVisibility(true);
    advanceStages(stageDelays.length);
    const panel = getDemoCard();
    const completedStage = getDemoStage(container);

    fireEvent.click(
      screen.getByRole("button", { name: "Replay AI demonstration" }),
    );

    expect(getDemoStage(container)).not.toBe(completedStage);
    expect(getDemoCard()).toBe(panel);
    expectStablePanel(panel);
    expect(getDemoStage(container)).toHaveAttribute("data-demo-stage", "0");
    expect(getRenderedTasks(container)).toHaveLength(0);
    expect(screen.queryByText("Timeline")).not.toBeInTheDocument();
    expect(screen.queryByText("AI Summary")).not.toBeInTheDocument();
  });

  it("renders the complete stable result when reduced motion is enabled", () => {
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

    const { container } = render(<AiDemoSection />);

    expect(getDemoCard()).toHaveAttribute("data-demo-state", "complete");
    expectStablePanel(getDemoCard());
    expect(getDemoStage(container)).toHaveAttribute("data-demo-stage", "5200");
    expect(getRenderedTasks(container)).toHaveLength(5);
    expect(screen.getAllByText(/Urgent|High|Medium/)).toHaveLength(5);
    expect(screen.getAllByRole("term", { hidden: true })).toHaveLength(4);
    expect(screen.getByText("Ready to start.")).toBeInTheDocument();
  });
});
