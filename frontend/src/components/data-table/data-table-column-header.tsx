import type { Column } from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";

import { Button } from "@/components/ui/button";

type DataTableColumnHeaderProps<Data, Value> = {
  column: Column<Data, Value>;
  title: string;
};

export function DataTableColumnHeader<Data, Value>({
  column,
  title,
}: DataTableColumnHeaderProps<Data, Value>) {
  if (!column.getCanSort()) {
    return title;
  }

  const sorting = column.getIsSorted();
  const SortIcon =
    sorting === "asc" ? ArrowUp : sorting === "desc" ? ArrowDown : ArrowUpDown;

  return (
    <Button
      className="-ml-3 h-8"
      onClick={column.getToggleSortingHandler()}
      size="sm"
      type="button"
      variant="ghost"
    >
      {title}
      <SortIcon aria-hidden="true" className="size-4" />
    </Button>
  );
}
