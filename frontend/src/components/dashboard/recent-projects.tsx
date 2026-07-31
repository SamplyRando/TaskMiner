import type { ColumnDef } from "@tanstack/react-table";
import { ArrowUpRight, FolderKanban } from "lucide-react";
import { memo, useMemo } from "react";
import { Link } from "react-router-dom";

import { DashboardDataTable } from "@/components/dashboard/dashboard-data-table";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { EmptyState } from "@/components/empty-state";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatDateTime } from "@/lib/format";
import type { DashboardRecentProject } from "@/types/dashboard";

type RecentProjectsProps = {
  items: DashboardRecentProject[];
};

export const RecentProjects = memo(function RecentProjects({
  items,
}: RecentProjectsProps) {
  const columns = useMemo<ColumnDef<DashboardRecentProject>[]>(
    () => [
      {
        accessorKey: "name",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Nom" />
        ),
        cell: ({ row }) => (
          <span className="font-medium">{row.original.name}</span>
        ),
      },
      {
        accessorKey: "workspace_name",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Workspace" />
        ),
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            {row.original.workspace_name}
          </span>
        ),
      },
      {
        accessorKey: "task_count",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Tâches" />
        ),
      },
      {
        accessorKey: "created_at",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Créé le" />
        ),
        cell: ({ row }) => (
          <span className="text-muted-foreground whitespace-nowrap">
            {formatDateTime(row.original.created_at)}
          </span>
        ),
      },
      {
        id: "actions",
        enableGlobalFilter: false,
        enableSorting: false,
        header: () => <span className="sr-only">Actions</span>,
        cell: ({ row }) => (
          <div className="text-right">
            <Link
              aria-label={`Ouvrir le projet ${row.original.name}`}
              className="text-primary inline-flex items-center gap-1 text-sm font-medium hover:underline"
              to="/app/projects"
            >
              Ouvrir
              <ArrowUpRight aria-hidden="true" className="size-3.5" />
            </Link>
          </div>
        ),
      },
    ],
    [],
  );

  return (
    <Card className="min-w-0">
      <CardHeader>
        <CardTitle>Projets récents</CardTitle>
        <CardDescription>Les cinq derniers projets créés.</CardDescription>
      </CardHeader>
      <CardContent className="px-0 pb-2">
        {items.length === 0 ? (
          <EmptyState
            description="Créez un projet pour commencer à organiser vos tâches."
            icon={FolderKanban}
            title="Aucun projet"
          />
        ) : (
          <DashboardDataTable
            columns={columns}
            data={items}
            searchLabel="Rechercher un projet récent"
            searchPlaceholder="Rechercher un projet…"
          />
        )}
      </CardContent>
    </Card>
  );
});
