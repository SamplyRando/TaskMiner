import { Filter, RotateCcw } from "lucide-react";
import { memo } from "react";

import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import type {
  DashboardFilterOptions,
  DashboardParams,
  DashboardPeriod,
} from "@/types/dashboard";

type DashboardFiltersProps = {
  filters: DashboardParams;
  options: DashboardFilterOptions;
  onChange: (filters: DashboardParams) => void;
};

const periodOptions: { label: string; value: DashboardPeriod }[] = [
  { label: "7 jours", value: "7d" },
  { label: "30 jours", value: "30d" },
  { label: "90 jours", value: "90d" },
];

export const DashboardFilters = memo(function DashboardFilters({
  filters,
  onChange,
  options,
}: DashboardFiltersProps) {
  const hasFilters = Boolean(
    filters.workspace_id ?? filters.project_id ?? filters.user_id,
  );

  return (
    <section
      aria-label="Filtres globaux du dashboard"
      className="bg-card grid gap-3 rounded-xl border p-4 shadow-sm sm:grid-cols-2 xl:grid-cols-[auto_repeat(4,minmax(0,1fr))_auto] xl:items-end"
    >
      <div className="text-muted-foreground flex items-center gap-2 self-center text-sm font-medium sm:col-span-2 xl:col-span-1">
        <Filter aria-hidden="true" className="size-4" />
        Filtres
      </div>
      <label className="space-y-1.5 text-sm font-medium">
        <span>Workspace</span>
        <Select
          aria-label="Filtrer par workspace"
          onChange={(event) => {
            const workspaceId = event.target.value;
            const nextFilters = { ...filters };
            delete nextFilters.project_id;
            delete nextFilters.workspace_id;
            if (workspaceId) {
              nextFilters.workspace_id = workspaceId;
            }
            onChange(nextFilters);
          }}
          value={filters.workspace_id ?? ""}
        >
          <option value="">Tous les workspaces</option>
          {options.workspaces.map((workspace) => (
            <option key={workspace.id} value={workspace.id}>
              {workspace.name}
            </option>
          ))}
        </Select>
      </label>
      <label className="space-y-1.5 text-sm font-medium">
        <span>Période</span>
        <Select
          aria-label="Filtrer par période"
          onChange={(event) => {
            onChange({
              ...filters,
              period: event.target.value as DashboardPeriod,
            });
          }}
          value={filters.period}
        >
          {periodOptions.map((period) => (
            <option key={period.value} value={period.value}>
              {period.label}
            </option>
          ))}
        </Select>
      </label>
      <label className="space-y-1.5 text-sm font-medium">
        <span>Projet</span>
        <Select
          aria-label="Filtrer par projet"
          onChange={(event) => {
            const nextFilters = { ...filters };
            delete nextFilters.project_id;
            const projectId = event.target.value;
            if (projectId) {
              nextFilters.project_id = projectId;
            }
            onChange(nextFilters);
          }}
          value={filters.project_id ?? ""}
        >
          <option value="">Tous les projets</option>
          {options.projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </Select>
      </label>
      <label className="space-y-1.5 text-sm font-medium">
        <span>Utilisateur</span>
        <Select
          aria-label="Filtrer par utilisateur"
          onChange={(event) => {
            const nextFilters = { ...filters };
            delete nextFilters.user_id;
            const userId = event.target.value;
            if (userId) {
              nextFilters.user_id = userId;
            }
            onChange(nextFilters);
          }}
          value={filters.user_id ?? ""}
        >
          <option value="">Tous les utilisateurs</option>
          {options.users.map((user) => (
            <option key={user.id} value={user.id}>
              {user.name}
            </option>
          ))}
        </Select>
      </label>
      <Button
        disabled={!hasFilters}
        onClick={() => {
          onChange({
            activity_limit: filters.activity_limit,
            period: filters.period,
          });
        }}
        type="button"
        variant="outline"
      >
        <RotateCcw aria-hidden="true" className="size-4" />
        Effacer
      </Button>
    </section>
  );
});
