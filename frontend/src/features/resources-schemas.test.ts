import { describe, expect, it } from "vitest";

import { projectFormSchema } from "@/features/projects/schemas";
import { taskAssignmentSchema, taskFormSchema } from "@/features/tasks/schemas";
import { workspaceFormSchema } from "@/features/workspaces/schemas";
import { projectId, userId } from "@/test/resource-fixtures";

describe("resource form schemas", () => {
  it("validates workspace and project names", () => {
    expect(
      workspaceFormSchema.safeParse({ description: "", name: " " }).success,
    ).toBe(false);
    expect(
      projectFormSchema.safeParse({ description: "", name: "Projet" }).success,
    ).toBe(true);
  });

  it("validates task values and project identifiers", () => {
    expect(
      taskFormSchema.safeParse({
        description: "",
        dueDate: "",
        priority: "urgent",
        projectId,
        status: "in_progress",
        title: "Publier la version",
      }).success,
    ).toBe(true);
    expect(
      taskFormSchema.safeParse({
        description: "",
        dueDate: "",
        priority: "unknown",
        projectId: "invalid",
        status: "todo",
        title: "",
      }).success,
    ).toBe(false);
  });

  it("accepts an empty or valid assignment and rejects malformed UUIDs", () => {
    expect(taskAssignmentSchema.safeParse({ assignedUserId: "" }).success).toBe(
      true,
    );
    expect(
      taskAssignmentSchema.safeParse({ assignedUserId: userId }).success,
    ).toBe(true);
    expect(
      taskAssignmentSchema.safeParse({ assignedUserId: "not-a-uuid" }).success,
    ).toBe(false);
  });
});
