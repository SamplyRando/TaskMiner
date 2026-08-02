import type { ColumnDef } from "@tanstack/react-table";
import { ArrowUpRight, ListChecks } from "lucide-react";
import { memo, useMemo } from "react";
import { Link } from "react-router-dom";

import { DashboardDataTable } from "@/components/dashboard/dashboard-data-table";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { DashboardRecentTask } from "@/types/dashboard";
import type { TaskPriority, TaskStatus } from "@/types/task";

const statusLabels: Record<TaskStatus, string> = {
  done: "Terminée",
  in_progress: "En cours",
  todo: "À faire",
};

const priorityConfig: Record<
  TaskPriority,
  { className: string; label: string }
> = {
  high: { className: "text-orange-700", label: "Haute" },
  low: { className: "text-slate-600", label: "Basse" },
  medium: { className: "text-blue-700", label: "Moyenne" },
  urgent: { className: "text-rose-700", label: "Urgente" },
};

type RecentTasksProps = {
  description: string;
  emptyDescription: string;
  emptyTitle: string;
  items: DashboardRecentTask[];
  title: string;
};

export const RecentTasks = memo(function RecentTasks({
  description,
  emptyDescription,
  emptyTitle,
  items,
  title,
}: RecentTasksProps) {
  const columns = useMemo<ColumnDef<DashboardRecentTask>[]>(
    () => [
      {
        accessorKey: "title",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Titre" />
        ),
        cell: ({ row }) => (
          <span className="block max-w-56 truncate font-medium">
            {row.original.title}
          </span>
        ),
      },
      {
        accessorKey: "project_name",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Projet" />
        ),
        cell: ({ row }) => (
          <span className="text-muted-foreground block max-w-48 truncate">
            {row.original.project_name}
          </span>
        ),
      },
      {
        accessorKey: "status",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Statut" />
        ),
        cell: ({ row }) => (
          <Badge
            variant={row.original.status === "done" ? "default" : "secondary"}
          >
            {statusLabels[row.original.status]}
          </Badge>
        ),
      },
      {
        accessorKey: "priority",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Priorité" />
        ),
        cell: ({ row }) => (
          <span
            className={cn(
              "text-sm",
              priorityConfig[row.original.priority].className,
            )}
          >
            {priorityConfig[row.original.priority].label}
          </span>
        ),
      },
      {
        accessorKey: "assigned_user",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Assigné" />
        ),
        cell: ({ row }) => (
          <span className="text-muted-foreground whitespace-nowrap">
            {row.original.assigned_user ?? "Non assignée"}
          </span>
        ),
      },
      {
        accessorKey: "created_at",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Date" />
        ),
        cell: ({ row }) => (
          <span className="text-muted-foreground whitespace-nowrap">
            {formatDateTime(row.original.created_at)}
          </span>
        ),
      },
      {
        accessorKey: "due_date",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Échéance" />
        ),
        cell: ({ row }) => (
          <span className="text-muted-foreground whitespace-nowrap">
            {formatDateTime(row.original.due_date)}
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
              aria-label={`Ouvrir la tâche ${row.original.title}`}
              className="text-primary inline-flex items-center gap-1 text-sm font-medium hover:underline"
              to="/app/tasks"
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
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="px-0 pb-2">
        {items.length === 0 ? (
          <EmptyState
            description={emptyDescription}
            icon={ListChecks}
            title={emptyTitle}
          />
        ) : (
          <DashboardDataTable
            columns={columns}
            data={items}
            searchLabel={`Rechercher dans ${title.toLocaleLowerCase("fr-FR")}`}
            searchPlaceholder="Rechercher une tâche…"
          />
        )}
      </CardContent>
    </Card>
  );
});
