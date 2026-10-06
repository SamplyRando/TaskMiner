import { describe, expect, it } from "vitest";

import {
  getTaskStatusClass,
  getTaskStatusTone,
  isTaskOverdue,
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

  it("derives the status tone used by dots and badges", () => {
    expect(getTaskStatusTone("in_progress")).toBe("info");
    expect(getTaskStatusTone("review", true)).toBe("success");
    expect(getTaskStatusTone("review")).toBe("neutral");
  });

  it("flags only unfinished tasks whose due date has passed", () => {
    const now = Date.parse("2026-10-06T12:00:00Z");
    const base = { status: "todo", status_is_completed: false } as const;

    expect(
      isTaskOverdue({ ...base, due_date: "2026-10-05T12:00:00Z" }, now),
    ).toBe(true);
    expect(
      isTaskOverdue({ ...base, due_date: "2026-10-07T12:00:00Z" }, now),
    ).toBe(false);
    expect(isTaskOverdue({ ...base, due_date: null }, now)).toBe(false);
    expect(
      isTaskOverdue(
        {
          due_date: "2026-10-05T12:00:00Z",
          status: "done",
          status_is_completed: true,
        },
        now,
      ),
    ).toBe(false);
    expect(
      isTaskOverdue({ due_date: "2026-10-05T12:00:00Z", status: "done" }, now),
    ).toBe(false);
  });
});
