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

type DataTableProps<Data> = {
  columns: ColumnDef<Data>[];
  data: Data[];
  emptyDescription: string;
  emptyTitle: string;
  isLoading: boolean;
  manualPagination: boolean;
  manualSorting: boolean;
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
  emptyDescription,
  emptyTitle,
  isLoading,
  manualPagination,
  manualSorting,
  onPaginationChange,
  onSortingChange,
  pageCount,
  pagination,
  sorting,
  total,
}: DataTableProps<Data>) {
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
      <div className="bg-card overflow-hidden rounded-xl border">
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
              ? Array.from({ length: pagination.pageSize }, (_, rowIndex) => (
                  <TableRow key={`skeleton-${String(rowIndex)}`}>
                    {columns.map((_column, columnIndex) => (
                      <TableCell key={`cell-${String(columnIndex)}`}>
                        <Skeleton className="h-5 w-full max-w-40" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
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
        {!isLoading && table.getRowModel().rows.length === 0 ? (
          <div className="flex min-h-64 flex-col items-center justify-center px-6 text-center">
            <p className="font-medium">{emptyTitle}</p>
            <p className="text-muted-foreground mt-1 max-w-md text-sm">
              {emptyDescription}
            </p>
          </div>
        ) : null}
      </div>

      <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
        <p className="text-muted-foreground text-sm">
          {total} élément{total > 1 ? "s" : ""}
        </p>
        <div className="flex items-center gap-2">
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
