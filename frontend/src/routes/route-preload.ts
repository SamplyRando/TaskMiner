const routeLoaders: Record<string, () => Promise<unknown>> = {
  "/app": () => import("@/pages/home-page"),
  "/app/activity": () => import("@/pages/activity-page"),
  "/app/audit": () => import("@/pages/audit-page"),
  "/app/invitations": () => import("@/pages/invitations-page"),
  "/app/projects": () => import("@/pages/projects-page"),
  "/app/settings": () => import("@/pages/settings-page"),
  "/app/tasks": () => import("@/pages/tasks-page"),
  "/app/workspace": () => import("@/pages/workspace-page"),
};

export function preloadRoute(path: string): void {
  void routeLoaders[path]?.();
}
