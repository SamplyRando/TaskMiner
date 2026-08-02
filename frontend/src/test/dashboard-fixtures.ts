import type { DashboardData } from "@/types/dashboard";

export const dashboardFixture: DashboardData = {
  kpis: {
    completed: 5,
    completion_rate: 50,
    average_completion_hours: 36,
    average_tasks_per_project: 2.5,
    due_this_week: 3,
    due_today: 1,
    in_progress: 3,
    overdue: 2,
    pending: 2,
    projects: 4,
    tasks: 10,
    urgent: 1,
    variations: {
      average_completion_hours: -10,
      average_tasks_per_project: 5,
      completed: 25,
      completion_rate: 4,
      projects: 10,
      tasks: 20,
      workspaces: null,
    },
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
      message: "Tâche créée : Préparer la livraison",
      resource: "task",
      resource_id: "00000000-0000-4000-8000-000000000004",
      actor: {
        email: "ada@example.com",
        full_name: "Ada Lovelace",
        id: "00000000-0000-4000-8000-000000000001",
      },
      workspace_id: "00000000-0000-4000-8000-000000000002",
      workspace_name: "Produit",
    },
  ],
  recent_projects: [
    {
      created_at: "2026-07-30T10:00:00Z",
      id: "00000000-0000-4000-8000-000000000003",
      name: "Application mobile",
      completed_task_count: 4,
      progress: 50,
      status: "active",
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
      due_date: "2026-08-03T10:00:00Z",
      id: "00000000-0000-4000-8000-000000000004",
      priority: "urgent",
      project_id: "00000000-0000-4000-8000-000000000003",
      project_name: "Application mobile",
      status: "in_progress",
      title: "Préparer la livraison",
      workspace_id: "00000000-0000-4000-8000-000000000002",
      workspace_name: "Produit",
    },
  ],
  my_tasks: [
    {
      assigned_user: "Ada Lovelace",
      assigned_user_id: "00000000-0000-4000-8000-000000000001",
      created_at: "2026-07-31T10:00:00Z",
      due_date: "2026-08-03T10:00:00Z",
      id: "00000000-0000-4000-8000-000000000004",
      priority: "urgent",
      project_id: "00000000-0000-4000-8000-000000000003",
      project_name: "Application mobile",
      status: "in_progress",
      title: "Préparer la livraison",
      workspace_id: "00000000-0000-4000-8000-000000000002",
      workspace_name: "Produit",
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
  trends: {
    backlog: [
      { count: 8, date: "2026-07-30" },
      { count: 10, date: "2026-07-31" },
    ],
    task_completions: [
      { count: 0, date: "2026-07-30" },
      { count: 2, date: "2026-07-31" },
    ],
    task_creations: [
      { count: 1, date: "2026-07-30" },
      { count: 4, date: "2026-07-31" },
    ],
    workspace_creations: [
      { count: 0, date: "2026-07-30" },
      { count: 1, date: "2026-07-31" },
    ],
  },
  project_distribution: [
    {
      count: 8,
      percentage: 80,
      project_id: "00000000-0000-4000-8000-000000000003",
      project_name: "Application mobile",
    },
  ],
  assignee_distribution: [
    {
      count: 6,
      percentage: 60,
      user_id: "00000000-0000-4000-8000-000000000001",
      user_name: "Ada Lovelace",
    },
  ],
  event_distribution: [{ count: 4, event: "task_created", percentage: 100 }],
  filter_options: {
    projects: [
      {
        id: "00000000-0000-4000-8000-000000000003",
        name: "Application mobile",
        workspace_id: "00000000-0000-4000-8000-000000000002",
      },
    ],
    users: [
      {
        id: "00000000-0000-4000-8000-000000000001",
        name: "Ada Lovelace",
      },
    ],
    workspaces: [
      {
        id: "00000000-0000-4000-8000-000000000002",
        name: "Produit",
      },
    ],
  },
};

export const emptyDashboardFixture: DashboardData = {
  ...dashboardFixture,
  kpis: {
    completed: 0,
    completion_rate: 0,
    average_completion_hours: 0,
    average_tasks_per_project: 0,
    due_this_week: 0,
    due_today: 0,
    in_progress: 0,
    overdue: 0,
    pending: 0,
    projects: 0,
    tasks: 0,
    urgent: 0,
    variations: {
      average_completion_hours: null,
      average_tasks_per_project: null,
      completed: null,
      completion_rate: null,
      projects: null,
      tasks: null,
      workspaces: null,
    },
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
  trends: {
    backlog: dashboardFixture.trends.backlog.map((item) => ({
      ...item,
      count: 0,
    })),
    task_completions: dashboardFixture.trends.task_completions.map((item) => ({
      ...item,
      count: 0,
    })),
    task_creations: dashboardFixture.trends.task_creations.map((item) => ({
      ...item,
      count: 0,
    })),
    workspace_creations: dashboardFixture.trends.workspace_creations.map(
      (item) => ({ ...item, count: 0 }),
    ),
  },
  project_distribution: [],
  assignee_distribution: [],
  event_distribution: [],
};
