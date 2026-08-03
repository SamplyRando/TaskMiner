import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useMediaQuery } from "@/hooks/use-media-query";

type DashboardDataTableProps<Data> = {
  columns: ColumnDef<Data>[];
  data: Data[];
  mobileLabels?: Record<string, string>;
  searchLabel: string;
  searchPlaceholder: string;
};

export function DashboardDataTable<Data>({
  columns,
  data,
  mobileLabels = {},
  searchLabel,
  searchPlaceholder,
}: DashboardDataTableProps<Data>) {
  const isMobile = useMediaQuery("(max-width: 767px)");
  const [globalFilter, setGlobalFilter] = useState("");
  const [sorting, setSorting] = useState<SortingState>([]);

  // TanStack Table owns a mutable table instance by design.
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    columns,
    data,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    globalFilterFn: "includesString",
    initialState: { pagination: { pageIndex: 0, pageSize: 5 } },
    onGlobalFilterChange: setGlobalFilter,
    onSortingChange: setSorting,
    state: { globalFilter, sorting },
  });

  return (
    <div>
      <div className="relative mx-6 mb-4 max-w-sm">
        <Search
          aria-hidden="true"
          className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2"
        />
        <Input
          aria-label={searchLabel}
          className="pl-9"
          onChange={(event) => {
            table.setGlobalFilter(event.target.value);
            table.setPageIndex(0);
          }}
          placeholder={searchPlaceholder}
          value={globalFilter}
        />
      </div>

      {!isMobile ? (
        <div>
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="divide-y">
          {table.getRowModel().rows.map((row) => (
            <article className="space-y-3 px-6 py-4" key={`mobile-${row.id}`}>
              {row.getVisibleCells().map((cell) => (
                <div
                  className={
                    cell.column.id === "actions"
                      ? "flex justify-end border-t pt-3"
                      : "grid grid-cols-[5.5rem_minmax(0,1fr)] gap-3"
                  }
                  key={cell.id}
                >
                  {cell.column.id === "actions" ? null : (
                    <span className="text-muted-foreground text-xs font-medium">
                      {mobileLabels[cell.column.id] ?? cell.column.id}
                    </span>
                  )}
                  <div className="min-w-0 text-sm">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </div>
                </div>
              ))}
            </article>
          ))}
        </div>
      )}

      {table.getRowModel().rows.length === 0 ? (
        <p className="text-muted-foreground px-6 py-10 text-center text-sm">
          Aucun résultat pour cette recherche.
        </p>
      ) : null}

      <div className="flex flex-col items-center justify-between gap-3 border-t px-6 py-3 sm:flex-row">
        <p className="text-muted-foreground text-sm">
          {table.getFilteredRowModel().rows.length} résultat
          {table.getFilteredRowModel().rows.length > 1 ? "s" : ""}
        </p>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground text-sm">
            Page {table.getState().pagination.pageIndex + 1} sur{" "}
            {Math.max(table.getPageCount(), 1)}
          </span>
          <Button
            aria-label="Page précédente"
            disabled={!table.getCanPreviousPage()}
            onClick={() => {
              table.previousPage();
            }}
            size="icon"
            type="button"
            variant="ghost"
          >
            <ChevronLeft aria-hidden="true" className="size-4" />
          </Button>
          <Button
            aria-label="Page suivante"
            disabled={!table.getCanNextPage()}
            onClick={() => {
              table.nextPage();
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
