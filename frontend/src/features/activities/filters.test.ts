import { describe, expect, it } from "vitest";

import { matchesActivityFilters } from "@/features/activities/filters";
import { activityFixture, firstWorkspace } from "@/test/activity-fixtures";

describe("matchesActivityFilters", () => {
  it("filters by actor and event type", () => {
    const actorId = activityFixture.actor_id;
    expect(actorId).not.toBeNull();
    if (!actorId) {
      throw new Error("The activity fixture must have an actor.");
    }
    expect(
      matchesActivityFilters(
        activityFixture,
        {
          actor_id: actorId,
          event_type: "task_created",
        },
        firstWorkspace.name,
      ),
    ).toBe(true);
    expect(
      matchesActivityFilters(
        activityFixture,
        { event_type: "project_created" },
        firstWorkspace.name,
      ),
    ).toBe(false);
  });

  it("searches actor, message, metadata, and workspace", () => {
    for (const search of ["ada", "mise en production", "tâche", "produit"]) {
      expect(
        matchesActivityFilters(
          activityFixture,
          { search },
          firstWorkspace.name,
        ),
      ).toBe(true);
    }
  });

  it("filters real-time events by period", () => {
    const now = new Date("2026-08-01T12:00:00Z").getTime();
    const oldActivity = {
      ...activityFixture,
      created_at: "2026-07-20T12:00:00Z",
    };

    expect(
      matchesActivityFilters(
        oldActivity,
        { period: "week" },
        firstWorkspace.name,
        now,
      ),
    ).toBe(false);
    expect(
      matchesActivityFilters(
        oldActivity,
        { period: "month" },
        firstWorkspace.name,
        now,
      ),
    ).toBe(true);
  });
});
