import type {
  ColumnDef,
  PaginationState,
  SortingState,
} from "@tanstack/react-table";
import { render, screen } from "@testing-library/react";
import { useState } from "react";
import { vi } from "vitest";

import { DataTable } from "@/components/data-table/data-table";
import { Button } from "@/components/ui/button";

type Row = { id: string; name: string; status: string };

const columns: ColumnDef<Row>[] = [
  { accessorKey: "name", header: "Nom" },
  { accessorKey: "status", header: "Statut" },
];

function TableHarness({
  data = [],
  loading = false,
}: {
  data?: Row[];
  loading?: boolean;
}) {
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });
  const [sorting, setSorting] = useState<SortingState>([]);
  return (
    <DataTable
      columns={columns}
      data={data}
      emptyAction={<Button>Créer</Button>}
      emptyDescription="Commencez par créer un élément."
      emptyTitle="Aucun élément"
      isLoading={loading}
      manualPagination={false}
      manualSorting={false}
      mobileLabels={{ name: "Nom", status: "Statut" }}
      onPaginationChange={setPagination}
      onSortingChange={setSorting}
      pageCount={data.length > 0 ? 1 : 0}
      pagination={pagination}
      sorting={sorting}
      total={data.length}
    />
  );
}

describe("DataTable", () => {
  it("renders a semantic table on desktop", () => {
    render(
      <TableHarness data={[{ id: "1", name: "Roadmap", status: "Actif" }]} />,
    );

    expect(screen.getByRole("table")).toBeInTheDocument();
    expect(screen.getByText("Roadmap")).toBeInTheDocument();
  });

  it("renders labeled cards instead of an overflowing table on mobile", () => {
    const matchMedia = vi.spyOn(window, "matchMedia").mockReturnValue({
      addEventListener: () => undefined,
      addListener: () => undefined,
      dispatchEvent: () => false,
      matches: true,
      media: "(max-width: 767px)",
      onchange: null,
      removeEventListener: () => undefined,
      removeListener: () => undefined,
    });

    render(
      <TableHarness data={[{ id: "1", name: "Roadmap", status: "Actif" }]} />,
    );

    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    expect(screen.getByText("Roadmap")).toBeInTheDocument();
    expect(screen.getByText("Statut")).toBeInTheDocument();
    matchMedia.mockRestore();
  });

  it("renders a guided empty state with its action", () => {
    render(<TableHarness />);

    expect(screen.getByText("Aucun élément")).toBeInTheDocument();
    expect(
      screen.getByText("Commencez par créer un élément."),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Créer" })).toBeInTheDocument();
  });

  it("announces loading and renders responsive skeletons", () => {
    const { container } = render(<TableHarness loading />);
    expect(container.querySelector('[aria-busy="true"]')).toBeInTheDocument();
    expect(
      container.querySelectorAll(".skeleton-shimmer").length,
    ).toBeGreaterThan(0);
  });
});
