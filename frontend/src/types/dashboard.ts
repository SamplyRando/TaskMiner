import type { TaskPriority, TaskStatus } from "@/types/task";

export type ActivityEvent =
  | "workspace_created"
  | "workspace_updated"
  | "project_created"
  | "project_updated"
  | "project_deleted"
  | "task_created"
  | "task_updated"
  | "task_deleted"
  | "task_assigned"
  | "comment_created"
  | "attachment_uploaded"
  | "invitation_created"
  | "invitation_accepted"
  | "member_role_updated";

export type ActivityResource =
  | "workspace"
  | "project"
  | "task"
  | "comment"
  | "attachment"
  | "invitation"
  | "member";

export type DashboardKpis = {
  workspaces: number;
  projects: number;
  tasks: number;
  completed: number;
  in_progress: number;
  pending: number;
  urgent: number;
  completion_rate: number;
};

export type DashboardStatusItem = {
  status: TaskStatus;
  count: number;
  percentage: number;
};

export type DashboardPriorityItem = {
  priority: TaskPriority;
  count: number;
};

export type DashboardRecentProject = {
  id: string;
  name: string;
  workspace_id: string;
  workspace_name: string;
  task_count: number;
  created_at: string;
};

export type DashboardRecentTask = {
  id: string;
  title: string;
  project_id: string;
  project_name: string;
  status: TaskStatus;
  priority: TaskPriority;
  assigned_user_id: string | null;
  assigned_user: string | null;
  created_at: string;
};

export type DashboardActivity = {
  id: string;
  workspace_id: string;
  workspace_name: string;
  event: ActivityEvent;
  resource: ActivityResource;
  actor_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type DashboardPeriodStats = {
  created: number;
  completed: number;
  completion_rate: number;
};

export type DashboardQuickStats = {
  today: DashboardPeriodStats;
  week: DashboardPeriodStats;
  month: DashboardPeriodStats;
};

export type DashboardTrendPoint = {
  date: string;
  count: number;
};

export type DashboardData = {
  kpis: DashboardKpis;
  status_distribution: DashboardStatusItem[];
  priority_distribution: DashboardPriorityItem[];
  recent_activities: DashboardActivity[];
  recent_projects: DashboardRecentProject[];
  recent_tasks: DashboardRecentTask[];
  my_tasks: DashboardRecentTask[];
  quick_stats: DashboardQuickStats;
  task_creation_trend: DashboardTrendPoint[];
};
