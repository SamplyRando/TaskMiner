import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";

import { BrandMark } from "@/components/brand-logo";
import { RouteIndexingPolicy } from "@/components/route-indexing-policy";
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
const AIPage = lazy(async () => ({
  default: (await import("@/pages/ai-page")).AIPage,
}));
const HomePage = lazy(async () => ({
  default: (await import("@/pages/home-page")).HomePage,
}));
const ForgotPasswordPage = lazy(async () => ({
  default: (await import("@/pages/forgot-password-page")).ForgotPasswordPage,
}));
const InvitationsPage = lazy(async () => ({
  default: (await import("@/pages/invitations-page")).InvitationsPage,
}));
const LoginPage = lazy(async () => ({
  default: (await import("@/pages/login-page")).LoginPage,
}));
const LandingPage = lazy(async () => ({
  default: (await import("@/pages/marketing/landing")).LandingPage,
}));
const MarketingLayout = lazy(async () => ({
  default: (await import("@/layouts/marketing-layout")).MarketingLayout,
}));
const ProjectsPage = lazy(async () => ({
  default: (await import("@/pages/projects-page")).ProjectsPage,
}));
const PrivacyPage = lazy(async () => ({
  default: (await import("@/pages/privacy-page")).PrivacyPage,
}));
const RegisterPage = lazy(async () => ({
  default: (await import("@/pages/register-page")).RegisterPage,
}));
const ResetPasswordPage = lazy(async () => ({
  default: (await import("@/pages/reset-password-page")).ResetPasswordPage,
}));
const SettingsPage = lazy(async () => ({
  default: (await import("@/pages/settings-page")).SettingsPage,
}));
const TasksPage = lazy(async () => ({
  default: (await import("@/pages/tasks-page")).TasksPage,
}));
const VerifyEmailPage = lazy(async () => ({
  default: (await import("@/pages/verify-email-page")).VerifyEmailPage,
}));
const WorkspacePage = lazy(async () => ({
  default: (await import("@/pages/workspace-page")).WorkspacePage,
}));

const routeFallback = (
  <main
    aria-label="Chargement de la page"
    className="flex min-h-screen flex-col items-center justify-center gap-4"
  >
    <BrandMark className="text-primary size-12" />
    <Spinner className="text-primary size-6" label="Chargement de la page" />
  </main>
);

export function AppRouter() {
  return (
    <>
      <RouteIndexingPolicy />
      <Suspense fallback={routeFallback}>
        <Routes>
          <Route element={<MarketingLayout />}>
            <Route element={<LandingPage />} path="/" />
          </Route>

          <Route element={<PrivacyPage />} path="/privacy" />
          <Route element={<ForgotPasswordPage />} path="/forgot-password" />
          <Route element={<ResetPasswordPage />} path="/reset-password" />
          <Route element={<VerifyEmailPage />} path="/verify-email" />

          <Route element={<PublicRoute />}>
            <Route element={<LoginPage />} path="/login" />
            <Route element={<RegisterPage />} path="/register" />
          </Route>

          <Route element={<ProtectedRoute />}>
            <Route element={<MainLayout />} path="/app">
              <Route element={<HomePage />} index />
              <Route element={<AIPage />} path="ai" />
              <Route element={<ProjectsPage />} path="projects" />
              <Route element={<TasksPage />} path="tasks" />
              <Route element={<SettingsPage />} path="settings" />
              <Route element={<WorkspacePage />} path="workspace" />
              <Route element={<WorkspacePage />} path="workspaces" />
              <Route element={<ActivityPage />} path="activity" />
              <Route element={<AuditPage />} path="audit" />
              <Route element={<InvitationsPage />} path="invitations" />
            </Route>
          </Route>

          <Route element={<Navigate replace to="/app" />} path="*" />
        </Routes>
      </Suspense>
    </>
  );
}
