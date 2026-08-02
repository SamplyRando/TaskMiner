import { describe, expect, it } from "vitest";

import { matchesAuditFilters } from "@/features/audit/filters";
import { auditLogFixture } from "@/test/activity-fixtures";

describe("matchesAuditFilters", () => {
  it("combines actor, action, entity and result filters", () => {
    expect(
      matchesAuditFilters(auditLogFixture, {
        actor_id: "00000000-0000-4000-8000-000000000001",
        event_type: auditLogFixture.event,
        resource_type: auditLogFixture.resource,
        success: true,
      }),
    ).toBe(true);
    expect(matchesAuditFilters(auditLogFixture, { success: false })).toBe(
      false,
    );
  });

  it("searches actor, message, workspace, identifier and JSON changes", () => {
    for (const search of [
      "Ada",
      "Tâche modifiée",
      "Produit",
      auditLogFixture.resource_id,
      "urgent",
      "release",
      "succès",
    ]) {
      expect(matchesAuditFilters(auditLogFixture, { search })).toBe(true);
    }
  });

  it("filters rolling periods", () => {
    const now = new Date(auditLogFixture.created_at).getTime() + 2 * 86_400_000;

    expect(matchesAuditFilters(auditLogFixture, { period: "today" }, now)).toBe(
      false,
    );
    expect(matchesAuditFilters(auditLogFixture, { period: "week" }, now)).toBe(
      true,
    );
  });

  it("rejects unmatched full-text searches", () => {
    expect(
      matchesAuditFilters(auditLogFixture, { search: "unrelated value" }),
    ).toBe(false);
  });
});
