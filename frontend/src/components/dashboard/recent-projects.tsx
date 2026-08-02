import {
  flexRender,
  getCoreRowModel,
  type ColumnDef,
  useReactTable,
} from "@tanstack/react-table";
import {
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  FolderKanban,
  Search,
} from "lucide-react";
import { memo, useMemo } from "react";
import { Link } from "react-router-dom";

import { DashboardDataTable } from "@/components/dashboard/dashboard-data-table";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDateTime } from "@/lib/format";
import type {
  DashboardProjectSort,
  DashboardRecentProject,
} from "@/types/dashboard";

type ServerControls = {
  limit: number;
  offset: number;
  onPageChange: (offset: number) => void;
  onSearchChange: (search: string) => void;
  onSortChange: (sort: DashboardProjectSort) => void;
  search: string;
  sort: DashboardProjectSort;
  total: number;
};

type RecentProjectsProps = {
  items: DashboardRecentProject[];
  loading?: boolean;
  serverControls?: ServerControls;
};

const projectStatus = (project: DashboardRecentProject) =>
  project.status === "completed"
    ? "Terminé"
    : project.status === "active"
      ? "Actif"
      : "Vide";

const useProjectColumns = () =>
  useMemo<ColumnDef<DashboardRecentProject>[]>(
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
        accessorKey: "progress",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Progression" />
        ),
        cell: ({ row }) => (
          <div className="flex min-w-28 items-center gap-2">
            <Progress
              aria-label={`Progression de ${row.original.name}`}
              className="h-2"
              value={row.original.progress}
            />
            <span className="text-muted-foreground text-xs tabular-nums">
              {row.original.progress.toLocaleString("fr-FR")}%
            </span>
          </div>
        ),
      },
      {
        accessorKey: "status",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Statut" />
        ),
        cell: ({ row }) => (
          <Badge
            variant={
              row.original.status === "completed" ? "default" : "secondary"
            }
          >
            {projectStatus(row.original)}
          </Badge>
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

const serverHeaders = [
  "Nom",
  "Workspace",
  "Tâches",
  "Progression",
  "Statut",
  "Créé le",
  "Actions",
];

function ServerRecentProjects({
  columns,
  controls,
  items,
}: {
  columns: ColumnDef<DashboardRecentProject>[];
  controls: ServerControls;
  items: DashboardRecentProject[];
}) {
  // TanStack Table owns a mutable table instance by design.
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    columns,
    data: items,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    rowCount: controls.total,
  });
  const currentPage = Math.floor(controls.offset / controls.limit) + 1;
  const pageCount = Math.max(Math.ceil(controls.total / controls.limit), 1);

  return (
    <div>
      <div className="mx-6 mb-4 grid gap-3 sm:grid-cols-2">
        <div className="relative">
          <Search
            aria-hidden="true"
            className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2"
          />
          <Input
            aria-label="Rechercher un projet récent"
            className="pl-9"
            onChange={(event) => {
              controls.onSearchChange(event.target.value);
            }}
            placeholder="Rechercher un projet…"
            value={controls.search}
          />
        </div>
        <Select
          aria-label="Trier les projets récents"
          onChange={(event) => {
            controls.onSortChange(event.target.value as DashboardProjectSort);
          }}
          value={controls.sort}
        >
          <option value="-created_at">Plus récents</option>
          <option value="created_at">Plus anciens</option>
          <option value="name">Nom A–Z</option>
          <option value="-name">Nom Z–A</option>
          <option value="-task_count">Plus de tâches</option>
          <option value="-progress">Meilleure progression</option>
        </Select>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            {serverHeaders.map((header) => (
              <TableHead key={header}>{header}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.map((row) => (
            <TableRow key={row.id}>
              {row.getVisibleCells().map((cell) => (
                <TableCell key={cell.id}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {items.length === 0 ? (
        <p className="text-muted-foreground px-6 py-10 text-center text-sm">
          Aucun résultat pour cette recherche.
        </p>
      ) : null}

      <div className="flex flex-col items-center justify-between gap-3 border-t px-6 py-3 sm:flex-row">
        <p className="text-muted-foreground text-sm">
          {controls.total} résultat{controls.total > 1 ? "s" : ""}
        </p>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground text-sm">
            Page {currentPage} sur {pageCount}
          </span>
          <Button
            aria-label="Page précédente"
            disabled={controls.offset === 0}
            onClick={() => {
              controls.onPageChange(
                Math.max(controls.offset - controls.limit, 0),
              );
            }}
            size="icon"
            type="button"
            variant="ghost"
          >
            <ChevronLeft aria-hidden="true" className="size-4" />
          </Button>
          <Button
            aria-label="Page suivante"
            disabled={controls.offset + controls.limit >= controls.total}
            onClick={() => {
              controls.onPageChange(controls.offset + controls.limit);
            }}
            size="icon"
            type="button"
            variant="ghost"
          >
            <ChevronRight aria-hidden="true" className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export const RecentProjects = memo(function RecentProjects({
  items,
  loading = false,
  serverControls,
}: RecentProjectsProps) {
  const columns = useProjectColumns();

  return (
    <Card className="min-w-0">
      <CardHeader>
        <CardTitle>Projets récents</CardTitle>
        <CardDescription>
          Recherche, tri et pagination calculés côté serveur.
        </CardDescription>
      </CardHeader>
      <CardContent className="px-0 pb-2">
        {loading ? (
          <div
            aria-label="Chargement des projets récents"
            className="space-y-3 px-6 pb-4"
            role="status"
          >
            <Skeleton className="h-10 w-full" />
            {Array.from({ length: 5 }, (_, index) => (
              <Skeleton className="h-12 w-full" key={index} />
            ))}
          </div>
        ) : items.length === 0 && !serverControls?.search ? (
          <EmptyState
            description="Créez un projet pour commencer à organiser vos tâches."
            icon={FolderKanban}
            title="Aucun projet"
          />
        ) : serverControls ? (
          <ServerRecentProjects
            columns={columns}
            controls={serverControls}
            items={items}
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
