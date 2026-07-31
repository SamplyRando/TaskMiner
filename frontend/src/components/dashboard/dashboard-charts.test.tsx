import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import { DashboardCharts } from "@/components/dashboard/dashboard-charts";
import { dashboardFixture } from "@/test/dashboard-fixtures";

vi.mock("recharts", () => ({
  Bar: () => null,
  BarChart: ({
    children,
    data,
  }: {
    children?: ReactNode;
    data?: { name: string }[];
  }) => (
    <div data-testid="bar-chart">
      {data?.map((item) => item.name).join(",")}
      {children}
    </div>
  ),
  CartesianGrid: () => null,
  Legend: () => null,
  Line: () => null,
  LineChart: ({
    children,
    data,
  }: {
    children?: ReactNode;
    data?: { date: string }[];
  }) => (
    <div data-testid="line-chart">
      {data?.map((item) => item.date).join(",")}
      {children}
    </div>
  ),
  Pie: ({ data }: { data?: { name: string }[] }) => (
    <div data-testid="pie-chart-data">
      {data?.map((item) => item.name).join(",")}
    </div>
  ),
  PieChart: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  ResponsiveContainer: ({ children }: { children?: ReactNode }) => (
    <div>{children}</div>
  ),
  Tooltip: () => null,
  XAxis: () => null,
  YAxis: () => null,
}));

describe("DashboardCharts", () => {
  it("maps status, priority and trend data to responsive charts", () => {
    render(
      <DashboardCharts
        priorities={dashboardFixture.priority_distribution}
        statuses={dashboardFixture.status_distribution}
        trend={dashboardFixture.task_creation_trend}
      />,
    );

    expect(screen.getByText("Tendances")).toBeInTheDocument();
    expect(screen.getByTestId("pie-chart-data")).toHaveTextContent(
      "En attente,En cours,Terminées",
    );
    expect(screen.getByTestId("bar-chart")).toHaveTextContent(
      "Basse,Moyenne,Haute,Urgente",
    );
    expect(screen.getByTestId("line-chart")).toHaveTextContent("30 juil.");
  });
});
