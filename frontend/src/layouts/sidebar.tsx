import {
  Activity,
  CheckSquare2,
  ClipboardList,
  FolderKanban,
  Home,
  Mail,
  PanelsTopLeft,
  Settings,
  X,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useRef } from "react";
import { NavLink } from "react-router-dom";

import { BrandLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";
import { useMediaQuery } from "@/hooks/use-media-query";
import { cn } from "@/lib/utils";
import { preloadRoute } from "@/routes/route-preload";

type NavigationItem = {
  icon: LucideIcon;
  label: string;
  path: string;
  end?: boolean;
};

const navigationItems: NavigationItem[] = [
  { icon: Home, label: "Accueil", path: "/app", end: true },
  { icon: PanelsTopLeft, label: "Workspace", path: "/app/workspace" },
  { icon: FolderKanban, label: "Projets", path: "/app/projects" },
  { icon: CheckSquare2, label: "Tâches", path: "/app/tasks" },
  { icon: Activity, label: "Activité", path: "/app/activity" },
  { icon: ClipboardList, label: "Audit", path: "/app/audit" },
  { icon: Mail, label: "Invitations", path: "/app/invitations" },
  { icon: Settings, label: "Paramètres", path: "/app/settings" },
];

type SidebarProps = {
  isOpen: boolean;
  onClose: () => void;
};

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const isDesktop = useMediaQuery("(min-width: 1024px)");
  const isNavigable = isDesktop || isOpen;

  useEffect(() => {
    if (!isOpen || isDesktop) return;
    closeButtonRef.current?.focus();
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [isDesktop, isOpen, onClose]);

  return (
    <>
      <button
        aria-label="Fermer la navigation"
        className={cn(
          "fixed inset-0 z-30 bg-slate-950/50 transition-opacity lg:hidden",
          isOpen ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        onClick={onClose}
        type="button"
      />
      <aside
        aria-hidden={!isNavigable}
        className={cn(
          "bg-card fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r shadow-xl transition-transform duration-200 lg:translate-x-0 lg:shadow-none",
          isOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-16 items-center justify-between border-b px-6">
          <BrandLogo onClick={onClose} />
          <Button
            aria-label="Fermer le menu"
            className="lg:hidden"
            onClick={onClose}
            ref={closeButtonRef}
            size="icon"
            type="button"
            variant="ghost"
          >
            <X aria-hidden="true" className="size-5" />
          </Button>
        </div>
        <nav
          aria-label="Navigation principale"
          className="flex-1 space-y-1 p-4"
        >
          {navigationItems.map(({ end, icon: Icon, label, path }) => (
            <NavLink
              className={({ isActive }) =>
                cn(
                  "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-[color,background-color,transform] duration-150 active:scale-[0.99]",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                )
              }
              end={end ?? false}
              key={path}
              onClick={onClose}
              onFocus={() => {
                preloadRoute(path);
              }}
              onPointerEnter={() => {
                preloadRoute(path);
              }}
              tabIndex={isNavigable ? 0 : -1}
              to={path}
            >
              <Icon
                aria-hidden="true"
                className="size-4 transition-transform group-hover:scale-110"
              />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="text-muted-foreground border-t p-4 text-xs">
          <span className="font-medium">TaskMiner</span> · v0.1.0
        </div>
      </aside>
    </>
  );
}
