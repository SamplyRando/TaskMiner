import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type OnChangeFn,
  type PaginationState,
  type SortingState,
} from "@tanstack/react-table";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { ReactNode } from "react";

import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
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
import { useMediaQuery } from "@/hooks/use-media-query";

type DataTableProps<Data> = {
  columns: ColumnDef<Data>[];
  data: Data[];
  emptyAction?: ReactNode;
  emptyDescription: string;
  emptyTitle: string;
  isLoading: boolean;
  manualPagination: boolean;
  manualSorting: boolean;
  mobileLabels?: Record<string, string>;
  onPaginationChange: OnChangeFn<PaginationState>;
  onSortingChange: OnChangeFn<SortingState>;
  pageCount: number;
  pagination: PaginationState;
  sorting: SortingState;
  total: number;
};

export function DataTable<Data>({
  columns,
  data,
  emptyAction,
  emptyDescription,
  emptyTitle,
  isLoading,
  manualPagination,
  manualSorting,
  mobileLabels = {},
  onPaginationChange,
  onSortingChange,
  pageCount,
  pagination,
  sorting,
  total,
}: DataTableProps<Data>) {
  const isMobile = useMediaQuery("(max-width: 767px)");
  // TanStack Table owns a mutable table instance; React Compiler intentionally
  // leaves this hook un-memoized while preserving the library's expected model.
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    columns,
    data,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    manualPagination,
    manualSorting,
    onPaginationChange,
    onSortingChange,
    pageCount,
    state: { pagination, sorting },
  });

  return (
    <div className="space-y-4">
      <div
        aria-busy={isLoading}
        className="bg-card overflow-hidden rounded-xl border shadow-sm"
      >
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
                {isLoading
                  ? Array.from(
                      { length: pagination.pageSize },
                      (_, rowIndex) => (
                        <TableRow key={`skeleton-${String(rowIndex)}`}>
                          {columns.map((_column, columnIndex) => (
                            <TableCell key={`cell-${String(columnIndex)}`}>
                              <Skeleton className="h-5 w-full max-w-40" />
                            </TableCell>
                          ))}
                        </TableRow>
                      ),
                    )
                  : table.getRowModel().rows.map((row) => (
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
            {isLoading
              ? Array.from(
                  { length: Math.min(pagination.pageSize, 5) },
                  (_, rowIndex) => (
                    <div
                      className="space-y-3 p-4"
                      key={`mobile-skeleton-${String(rowIndex)}`}
                    >
                      <Skeleton className="h-5 w-2/3" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-9 w-28" />
                    </div>
                  ),
                )
              : table.getRowModel().rows.map((row) => (
                  <article
                    className="hover:bg-muted/30 space-y-3 p-4 transition-colors"
                    key={`mobile-${row.id}`}
                  >
                    {row.getVisibleCells().map((cell) => {
                      const isActions = cell.column.id === "actions";
                      return (
                        <div
                          className={
                            isActions
                              ? "flex justify-end border-t pt-3"
                              : "grid grid-cols-[minmax(5.5rem,0.4fr)_minmax(0,1fr)] items-start gap-3"
                          }
                          key={cell.id}
                        >
                          {isActions ? null : (
                            <span className="text-muted-foreground text-xs font-medium">
                              {mobileLabels[cell.column.id] ?? cell.column.id}
                            </span>
                          )}
                          <div
                            className={isActions ? "w-full" : "min-w-0 text-sm"}
                          >
                            {flexRender(
                              cell.column.columnDef.cell,
                              cell.getContext(),
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </article>
                ))}
          </div>
        )}
        {!isLoading && table.getRowModel().rows.length === 0 ? (
          <EmptyState
            action={emptyAction}
            description={emptyDescription}
            title={emptyTitle}
          />
        ) : null}
      </div>

      <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
        <p className="text-muted-foreground text-sm">
          {total} élément{total > 1 ? "s" : ""}
        </p>
        <div className="flex max-w-full flex-wrap items-center justify-center gap-2">
          <Select
            aria-label="Éléments par page"
            className="w-20"
            onChange={(event) => {
              table.setPageSize(Number(event.target.value));
            }}
            value={pagination.pageSize}
          >
            {[10, 20, 50].map((pageSize) => (
              <option key={pageSize} value={pageSize}>
                {pageSize}
              </option>
            ))}
          </Select>
          <span className="text-muted-foreground min-w-24 text-center text-sm">
            Page {pageCount === 0 ? 0 : pagination.pageIndex + 1} / {pageCount}
          </span>
          <Button
            aria-label="Page précédente"
            disabled={!table.getCanPreviousPage()}
            onClick={() => {
              table.previousPage();
            }}
            size="icon"
            type="button"
            variant="outline"
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
            variant="outline"
          >
            <ChevronRight aria-hidden="true" className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
