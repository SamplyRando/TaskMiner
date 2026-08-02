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

export type DashboardPeriod = "7d" | "30d" | "90d";

export type DashboardParams = {
  workspace_id?: string;
  project_id?: string;
  user_id?: string;
  period: DashboardPeriod;
  activity_limit: number;
};

export type DashboardProjectSort =
  "-created_at" | "created_at" | "name" | "-name" | "-task_count" | "-progress";

export type DashboardProjectListParams = {
  workspace_id?: string;
  project_id?: string;
  user_id?: string;
  period: DashboardPeriod;
  search?: string;
  sort: DashboardProjectSort;
  offset: number;
  limit: number;
};

export type DashboardKpiVariations = {
  workspaces: number | null;
  projects: number | null;
  tasks: number | null;
  completed: number | null;
  completion_rate: number | null;
  average_completion_hours: number | null;
  average_tasks_per_project: number | null;
};

export type DashboardKpis = {
  workspaces: number;
  projects: number;
  tasks: number;
  completed: number;
  in_progress: number;
  pending: number;
  urgent: number;
  overdue: number;
  due_today: number;
  due_this_week: number;
  completion_rate: number;
  average_completion_hours: number;
  average_tasks_per_project: number;
  variations: DashboardKpiVariations;
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

export type DashboardProjectDistributionItem = {
  project_id: string;
  project_name: string;
  count: number;
  percentage: number;
};

export type DashboardAssigneeDistributionItem = {
  user_id: string | null;
  user_name: string;
  count: number;
  percentage: number;
};

export type DashboardEventDistributionItem = {
  event: ActivityEvent;
  count: number;
  percentage: number;
};

export type DashboardRecentProject = {
  id: string;
  name: string;
  workspace_id: string;
  workspace_name: string;
  task_count: number;
  completed_task_count: number;
  progress: number;
  status: "active" | "completed" | "empty";
  created_at: string;
};

export type DashboardRecentProjectPage = {
  items: DashboardRecentProject[];
  total: number;
  offset: number;
  limit: number;
};

export type DashboardRecentTask = {
  id: string;
  title: string;
  workspace_id: string;
  workspace_name: string;
  project_id: string;
  project_name: string;
  status: TaskStatus;
  priority: TaskPriority;
  assigned_user_id: string | null;
  assigned_user: string | null;
  due_date: string | null;
  created_at: string;
};

export type DashboardActivityActor = {
  id: string;
  email: string;
  full_name: string;
};

export type DashboardActivity = {
  id: string;
  workspace_id: string;
  workspace_name: string;
  event: ActivityEvent;
  resource: ActivityResource;
  resource_id: string;
  actor_id: string | null;
  actor: DashboardActivityActor | null;
  message: string;
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

export type DashboardTrends = {
  task_creations: DashboardTrendPoint[];
  task_completions: DashboardTrendPoint[];
  backlog: DashboardTrendPoint[];
  workspace_creations: DashboardTrendPoint[];
};

export type DashboardFilterOptions = {
  workspaces: { id: string; name: string }[];
  projects: { id: string; name: string; workspace_id: string }[];
  users: { id: string; name: string }[];
};

export type DashboardData = {
  kpis: DashboardKpis;
  status_distribution: DashboardStatusItem[];
  priority_distribution: DashboardPriorityItem[];
  project_distribution: DashboardProjectDistributionItem[];
  assignee_distribution: DashboardAssigneeDistributionItem[];
  event_distribution: DashboardEventDistributionItem[];
  recent_activities: DashboardActivity[];
  recent_projects: DashboardRecentProject[];
  recent_tasks: DashboardRecentTask[];
  my_tasks: DashboardRecentTask[];
  quick_stats: DashboardQuickStats;
  task_creation_trend: DashboardTrendPoint[];
  trends: DashboardTrends;
  filter_options: DashboardFilterOptions;
};
