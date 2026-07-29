import { useState } from "react";
import { Outlet } from "react-router-dom";

import { Sidebar } from "@/layouts/sidebar";
import { Topbar } from "@/layouts/topbar";

export function MainLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="bg-background min-h-screen">
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
        <main className="p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
