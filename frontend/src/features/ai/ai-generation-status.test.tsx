import { act, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AIGenerationStatus } from "@/features/ai/ai-generation-status";

describe("AIGenerationStatus", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("cycles through honest planning stages without showing a percentage", () => {
    vi.useFakeTimers();
    vi.spyOn(window, "matchMedia").mockImplementation(
      () => ({ matches: false }) as MediaQueryList,
    );
    render(<AIGenerationStatus mode="plan" />);

    expect(screen.getAllByText("Analyse du brief")).toHaveLength(2);
    expect(screen.queryByText(/\d+%/)).toBeNull();
    act(() => {
      vi.advanceTimersByTime(1_800);
    });
    expect(screen.getAllByText("Structuration du projet")).toHaveLength(2);
  });

  it("keeps a stable complete loading state with reduced motion", () => {
    vi.useFakeTimers();
    vi.spyOn(window, "matchMedia").mockImplementation(
      () => ({ matches: true }) as MediaQueryList,
    );
    render(<AIGenerationStatus mode="change" />);

    act(() => {
      vi.advanceTimersByTime(10_000);
    });
    expect(screen.getAllByText("Lecture du projet")).toHaveLength(2);
    expect(
      screen.getByText("TaskMiner AI prépare votre brouillon"),
    ).toBeInTheDocument();
  });
});
