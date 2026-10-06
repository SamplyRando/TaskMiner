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
import { useEffect, useRef, type ReactNode } from "react";
import { NavLink } from "react-router-dom";

import { BrandLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";
import { Facet } from "@/components/ui/facet";
import { useMediaQuery } from "@/hooks/use-media-query";
import { cn } from "@/lib/utils";
import { preloadRoute } from "@/routes/route-preload";

type NavigationItem = {
  icon: LucideIcon | "facet";
  label: string;
  path: string;
  end?: boolean;
};

type NavigationGroup = {
  id: string;
  label?: string;
  items: NavigationItem[];
};

// Same links, same order as before: groups only add visual structure.
const navigationGroups: NavigationGroup[] = [
  {
    id: "home",
    items: [{ icon: Home, label: "Accueil", path: "/app", end: true }],
  },
  {
    id: "work",
    label: "Travail",
    items: [
      { icon: PanelsTopLeft, label: "Workspace", path: "/app/workspace" },
      { icon: FolderKanban, label: "Projets", path: "/app/projects" },
      { icon: CheckSquare2, label: "Tâches", path: "/app/tasks" },
      { icon: "facet", label: "TaskMiner AI", path: "/app/ai" },
    ],
  },
  {
    id: "tracking",
    label: "Suivi",
    items: [
      { icon: Activity, label: "Activité", path: "/app/activity" },
      { icon: ClipboardList, label: "Audit", path: "/app/audit" },
    ],
  },
  {
    id: "team",
    label: "Équipe",
    items: [{ icon: Mail, label: "Invitations", path: "/app/invitations" }],
  },
];

const settingsItem: NavigationItem = {
  icon: Settings,
  label: "Paramètres",
  path: "/app/settings",
};

// TaskMiner AI is the only entry marked with the Facette signature (brand
// colour, independent from the user accent).
function NavigationIcon({
  icon,
  isActive,
}: {
  icon: NavigationItem["icon"];
  isActive: boolean;
}) {
  if (icon === "facet") return <Facet className="size-4" />;
  const Icon = icon;
  return (
    <Icon
      aria-hidden="true"
      className={cn(
        "size-4 shrink-0 transition-colors duration-150",
        isActive ? "text-primary" : "group-hover:text-foreground",
      )}
    />
  );
}

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
    const previouslyFocused =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", closeOnEscape);
      previouslyFocused?.focus();
    };
  }, [isDesktop, isOpen, onClose]);

  const renderItem = ({
    end,
    icon,
    label,
    path,
  }: NavigationItem): ReactNode => (
    <NavLink
      className={({ isActive }) =>
        cn(
          "group relative flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors duration-150",
          isActive
            ? "bg-primary-subtle text-foreground before:bg-primary before:absolute before:inset-y-2 before:left-0 before:w-0.5 before:rounded-full"
            : "text-muted-foreground hover:bg-accent hover:text-foreground",
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
      {({ isActive }) => (
        <>
          <NavigationIcon icon={icon} isActive={isActive} />
          {label}
        </>
      )}
    </NavLink>
  );

  return (
    <>
      <button
        aria-label="Fermer la navigation"
        className={cn(
          "bg-scrim fixed inset-0 z-30 transition-opacity lg:hidden",
          isOpen ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        onClick={onClose}
        type="button"
      />
      <aside
        aria-hidden={!isNavigable}
        className={cn(
          "bg-surface shadow-floating fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r transition-transform duration-200 lg:translate-x-0 lg:shadow-none",
          isOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-14 items-center justify-between px-5">
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
          className="flex flex-1 flex-col gap-5 overflow-y-auto px-3 pt-3 pb-4"
        >
          {navigationGroups.map((group) =>
            group.label ? (
              <div
                aria-labelledby={`sidebar-group-${group.id}`}
                className="space-y-0.5"
                key={group.id}
                role="group"
              >
                <p
                  className="text-caption text-muted-foreground px-3 pb-1 uppercase"
                  id={`sidebar-group-${group.id}`}
                >
                  {group.label}
                </p>
                {group.items.map(renderItem)}
              </div>
            ) : (
              <div className="space-y-0.5" key={group.id}>
                {group.items.map(renderItem)}
              </div>
            ),
          )}
          <div className="mt-auto space-y-0.5 border-t pt-3">
            {renderItem(settingsItem)}
          </div>
        </nav>
        <div className="text-caption text-muted-foreground border-t px-5 py-3 font-normal">
          <span className="font-medium">TaskMiner</span> · v0.1.0
        </div>
      </aside>
    </>
  );
}
