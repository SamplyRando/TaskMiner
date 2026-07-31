import type { DashboardData } from "@/types/dashboard";

export const dashboardFixture: DashboardData = {
  kpis: {
    completed: 5,
    completion_rate: 50,
    in_progress: 3,
    pending: 2,
    projects: 4,
    tasks: 10,
    urgent: 1,
    workspaces: 2,
  },
  status_distribution: [
    { count: 2, percentage: 20, status: "todo" },
    { count: 3, percentage: 30, status: "in_progress" },
    { count: 5, percentage: 50, status: "done" },
  ],
  priority_distribution: [
    { count: 2, priority: "low" },
    { count: 4, priority: "medium" },
    { count: 3, priority: "high" },
    { count: 1, priority: "urgent" },
  ],
  recent_activities: [
    {
      actor_id: "00000000-0000-4000-8000-000000000001",
      created_at: "2026-07-31T10:00:00Z",
      event: "task_created",
      id: "00000000-0000-4000-8000-000000000020",
      metadata: { title: "Préparer la livraison" },
      resource: "task",
      workspace_id: "00000000-0000-4000-8000-000000000002",
      workspace_name: "Produit",
    },
  ],
  recent_projects: [
    {
      created_at: "2026-07-30T10:00:00Z",
      id: "00000000-0000-4000-8000-000000000003",
      name: "Application mobile",
      task_count: 8,
      workspace_id: "00000000-0000-4000-8000-000000000002",
      workspace_name: "Produit",
    },
  ],
  recent_tasks: [
    {
      assigned_user: "Ada Lovelace",
      assigned_user_id: "00000000-0000-4000-8000-000000000001",
      created_at: "2026-07-31T10:00:00Z",
      id: "00000000-0000-4000-8000-000000000004",
      priority: "urgent",
      project_id: "00000000-0000-4000-8000-000000000003",
      project_name: "Application mobile",
      status: "in_progress",
      title: "Préparer la livraison",
    },
  ],
  my_tasks: [
    {
      assigned_user: "Ada Lovelace",
      assigned_user_id: "00000000-0000-4000-8000-000000000001",
      created_at: "2026-07-31T10:00:00Z",
      id: "00000000-0000-4000-8000-000000000004",
      priority: "urgent",
      project_id: "00000000-0000-4000-8000-000000000003",
      project_name: "Application mobile",
      status: "in_progress",
      title: "Préparer la livraison",
    },
  ],
  quick_stats: {
    month: { completed: 12, completion_rate: 60, created: 20 },
    today: { completed: 2, completion_rate: 50, created: 4 },
    week: { completed: 7, completion_rate: 70, created: 10 },
  },
  task_creation_trend: [
    { count: 1, date: "2026-07-30" },
    { count: 4, date: "2026-07-31" },
  ],
};

export const emptyDashboardFixture: DashboardData = {
  ...dashboardFixture,
  kpis: {
    completed: 0,
    completion_rate: 0,
    in_progress: 0,
    pending: 0,
    projects: 0,
    tasks: 0,
    urgent: 0,
    workspaces: 0,
  },
  priority_distribution: dashboardFixture.priority_distribution.map((item) => ({
    ...item,
    count: 0,
  })),
  status_distribution: dashboardFixture.status_distribution.map((item) => ({
    ...item,
    count: 0,
    percentage: 0,
  })),
  recent_activities: [],
  recent_projects: [],
  recent_tasks: [],
  my_tasks: [],
  quick_stats: {
    month: { completed: 0, completion_rate: 0, created: 0 },
    today: { completed: 0, completion_rate: 0, created: 0 },
    week: { completed: 0, completion_rate: 0, created: 0 },
  },
  task_creation_trend: dashboardFixture.task_creation_trend.map((item) => ({
    ...item,
    count: 0,
  })),
};
