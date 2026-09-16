import { describe, expect, it } from "vitest";

import { buildAIPlanWarnings } from "@/features/ai/ai-plan-warning-utils";
import type { AIPlanReviewValues } from "@/features/ai/schemas";

const task = (
  sourceOrder: number,
  overrides: Partial<AIPlanReviewValues["tasks"][number]> = {},
): AIPlanReviewValues["tasks"][number] => ({
  assignedUserId: null,
  dependsOn: [],
  description: "Description",
  dueDate: "2026-09-10",
  milestone: "Delivery",
  priority: "medium",
  selected: true,
  sourceOrder,
  status: "todo",
  title: `Task ${String(sourceOrder)}`,
  ...overrides,
});

describe("buildAIPlanWarnings", () => {
  it("flags a deselected dependency and keeps the relationship human-readable", () => {
    const warnings = buildAIPlanWarnings(
      [],
      [
        task(1, { selected: false, title: "Define architecture" }),
        task(2, { dependsOn: [1], title: "Build API" }),
      ],
    );

    const dependencyWarning = warnings.find(
      (warning) => warning.taskOrder === 2,
    );
    expect(dependencyWarning?.level).toBe("warning");
    expect(dependencyWarning?.message).toContain("Define architecture");
  });

  it("blocks incoherent dependency references before confirmation", () => {
    const warnings = buildAIPlanWarnings(
      [],
      [task(1, { dependsOn: [2] }), task(2)],
    );

    expect(warnings.some((warning) => warning.level === "blocking")).toBe(true);
  });

  it("consolidates equivalent missing-schedule warnings", () => {
    const warnings = buildAIPlanWarnings(
      [
        "Aucune date cible n’a été fournie ; les échéances absolues restent vides.",
        "2 tâches n’ont pas encore de date suggérée.",
      ],
      [
        task(1, { assignedUserId: "member-1", dueDate: "" }),
        task(2, { assignedUserId: "member-1", dueDate: "" }),
      ],
    );

    const scheduleWarnings = warnings.filter(
      (warning) =>
        warning.message.includes("date cible") ||
        warning.message.includes("date suggérée"),
    );
    expect(scheduleWarnings).toHaveLength(1);
    expect(scheduleWarnings[0]?.level).toBe("info");
    expect(
      warnings.some((warning) => warning.id === "tasks-without-date"),
    ).toBe(false);
  });

  it("presents optional recommendations as information, not missing input", () => {
    const warnings = buildAIPlanWarnings(
      ["Recommandation proposée — à adapter si nécessaire."],
      [task(1, { assignedUserId: "member-1" })],
    );

    expect(warnings).toEqual([
      expect.objectContaining({
        level: "info",
        message: "Recommandation proposée — à adapter si nécessaire.",
      }),
    ]);
  });
});
