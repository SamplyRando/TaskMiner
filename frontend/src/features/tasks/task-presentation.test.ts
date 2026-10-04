import { describe, expect, it } from "vitest";

import {
  getTaskStatusClass,
  taskPriorityClasses,
  taskPriorityTones,
  taskStatusClasses,
} from "@/features/tasks/task-presentation";
import { toneBadgeClasses } from "@/lib/tones";

describe("task presentation tones", () => {
  it("maps priorities to semantic tones instead of raw palette colours", () => {
    expect(taskPriorityTones).toEqual({
      high: "warning",
      low: "neutral",
      medium: "info",
      urgent: "danger",
    });
    expect(taskPriorityClasses.urgent).toBe(toneBadgeClasses.danger);
    expect(Object.values(taskPriorityClasses).join(" ")).not.toMatch(
      /\b(?:bg|text|border)-(?:red|orange|blue|slate)-\d/,
    );
  });

  it("maps default and custom statuses to Jade, Cobalt or Graphite", () => {
    expect(taskStatusClasses.done).toBe(toneBadgeClasses.success);
    expect(taskStatusClasses.in_progress).toBe(toneBadgeClasses.info);
    expect(getTaskStatusClass("review", true)).toBe(toneBadgeClasses.success);
    expect(getTaskStatusClass("review")).toBe(toneBadgeClasses.neutral);
  });
});
