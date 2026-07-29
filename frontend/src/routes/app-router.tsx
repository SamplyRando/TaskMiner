import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";

import { Spinner } from "@/components/ui/spinner";
import { MainLayout } from "@/layouts/main-layout";
import { ProtectedRoute } from "@/routes/protected-route";
import { PublicRoute } from "@/routes/public-route";

const ActivityPage = lazy(async () => ({
  default: (await import("@/pages/activity-page")).ActivityPage,
}));
const AuditPage = lazy(async () => ({
  default: (await import("@/pages/audit-page")).AuditPage,
}));
const HomePage = lazy(async () => ({
  default: (await import("@/pages/home-page")).HomePage,
}));
const InvitationsPage = lazy(async () => ({
  default: (await import("@/pages/invitations-page")).InvitationsPage,
}));
const LoginPage = lazy(async () => ({
  default: (await import("@/pages/login-page")).LoginPage,
}));
const ProjectsPage = lazy(async () => ({
  default: (await import("@/pages/projects-page")).ProjectsPage,
}));
const RegisterPage = lazy(async () => ({
  default: (await import("@/pages/register-page")).RegisterPage,
}));
const SettingsPage = lazy(async () => ({
  default: (await import("@/pages/settings-page")).SettingsPage,
}));
const TasksPage = lazy(async () => ({
  default: (await import("@/pages/tasks-page")).TasksPage,
}));
const WorkspacePage = lazy(async () => ({
  default: (await import("@/pages/workspace-page")).WorkspacePage,
}));

const routeFallback = (
  <main className="flex min-h-64 items-center justify-center">
    <Spinner className="text-primary size-6" label="Chargement de la page" />
  </main>
);

export function AppRouter() {
  return (
    <Suspense fallback={routeFallback}>
      <Routes>
        <Route element={<PublicRoute />}>
          <Route element={<LoginPage />} path="/login" />
          <Route element={<RegisterPage />} path="/register" />
        </Route>

        <Route element={<ProtectedRoute />}>
          <Route element={<MainLayout />} path="/app">
            <Route element={<HomePage />} index />
            <Route element={<ProjectsPage />} path="projects" />
            <Route element={<TasksPage />} path="tasks" />
            <Route element={<SettingsPage />} path="settings" />
            <Route element={<WorkspacePage />} path="workspace" />
            <Route element={<ActivityPage />} path="activity" />
            <Route element={<AuditPage />} path="audit" />
            <Route element={<InvitationsPage />} path="invitations" />
          </Route>
        </Route>

        <Route element={<Navigate replace to="/app" />} path="/" />
        <Route element={<Navigate replace to="/app" />} path="*" />
      </Routes>
    </Suspense>
  );
}
