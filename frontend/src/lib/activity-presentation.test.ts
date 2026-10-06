import { describe, expect, it } from "vitest";

import { auditActionPresentation } from "@/features/audit/presentation";
import {
  activityEventLabels,
  activityEventTones,
  getActorInitials,
} from "@/lib/activity-presentation";
import { toneBadgeClasses } from "@/lib/tones";
import type { ActivityEvent } from "@/types/activity";

describe("activity presentation", () => {
  it("gives every event a semantic tone shared with the audit badges", () => {
    const events = Object.keys(activityEventLabels) as ActivityEvent[];

    expect(Object.keys(activityEventTones).sort()).toEqual([...events].sort());
    events.forEach((event) => {
      expect(auditActionPresentation[event].className).toBe(
        toneBadgeClasses[activityEventTones[event]],
      );
    });
    expect(activityEventTones.task_deleted).toBe("danger");
    expect(activityEventTones.task_created).toBe("success");
    expect(activityEventTones.member_role_updated).toBe("warning");
  });

  it("keeps the audit action labels unchanged", () => {
    expect(auditActionPresentation.task_updated.label).toBe("Modification");
    expect(auditActionPresentation.project_deleted.label).toBe("Suppression");
    expect(auditActionPresentation.task_assigned.label).toBe("Assignation");
    expect(auditActionPresentation.attachment_uploaded.label).toBe("Upload");
  });

  it("derives up to two initials for actor avatars", () => {
    expect(getActorInitials("Ada Lovelace")).toBe("AL");
    expect(getActorInitials("  grace   brewster hopper ")).toBe("GB");
    expect(getActorInitials("ada@example.com")).toBe("A");
  });
});
