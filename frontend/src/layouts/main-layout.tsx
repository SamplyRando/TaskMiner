import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";

import { AppearanceSync } from "@/components/providers/appearance-sync";
import { SkipLink } from "@/components/skip-link";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { Sidebar } from "@/layouts/sidebar";
import { Topbar } from "@/layouts/topbar";

const pageTitles: Record<string, string> = {
  "/app": "Dashboard",
  "/app/activity": "Activité",
  "/app/audit": "Audit",
  "/app/invitations": "Invitations",
  "/app/projects": "Projets",
  "/app/settings": "Paramètres",
  "/app/tasks": "Tâches",
  "/app/workspace": "Workspaces",
};

export function MainLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const location = useLocation();
  useDocumentTitle(pageTitles[location.pathname] ?? "TaskMiner");

  return (
    <div className="bg-background min-h-screen min-w-0">
      <AppearanceSync />
      <SkipLink />
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => {
          setIsSidebarOpen(false);
        }}
      />
      <div className="lg:pl-72">
        <Topbar
          onMenuClick={() => {
            setIsSidebarOpen(true);
          }}
        />
        <main className="min-w-0 p-4 sm:p-6 lg:p-8" id="main-content">
          <div className="mx-auto max-w-[100rem] min-w-0">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
