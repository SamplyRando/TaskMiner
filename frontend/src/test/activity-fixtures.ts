import type { ActivityFeed, ActivityItem } from "@/types/activity";
import type { AuditFeed, AuditLog } from "@/types/audit";
import type { Workspace } from "@/types/workspace";

export const firstWorkspace: Workspace = {
  created_at: "2026-08-01T08:00:00Z",
  description: "Espace produit",
  id: "00000000-0000-4000-8000-000000000101",
  name: "Produit",
  owner_id: "00000000-0000-4000-8000-000000000001",
  updated_at: "2026-08-01T08:00:00Z",
};

export const secondWorkspace: Workspace = {
  ...firstWorkspace,
  id: "00000000-0000-4000-8000-000000000102",
  name: "Marketing",
};

export const activityFixture: ActivityItem = {
  actor_id: "00000000-0000-4000-8000-000000000001",
  created_at: "2026-08-01T10:30:00Z",
  event: "task_created",
  id: "00000000-0000-4000-8000-000000000110",
  metadata: { title: "Préparer la mise en production" },
  resource: "task",
};

export const activityFeedFixture: ActivityFeed = {
  count: 1,
  items: [activityFixture],
};

export const auditLogFixture: AuditLog = {
  actor_id: "00000000-0000-4000-8000-000000000001",
  created_at: "2026-08-01T10:45:00Z",
  event: "task_updated",
  id: "00000000-0000-4000-8000-000000000120",
  metadata: { title: "Préparer la mise en production" },
  new_values: {
    priority: "urgent",
    settings: { notify: true },
    tags: ["release", "backend"],
  },
  old_values: null,
  resource: "task",
  resource_id: "00000000-0000-4000-8000-000000000004",
};

export const auditFeedFixture: AuditFeed = {
  count: 1,
  items: [auditLogFixture],
};
