import type { CSSProperties } from "react";

// Chart colours come from the --chart-1…6 tokens so every chart follows the
// light and dark themes. They do not follow the user accent: a series keeps
// its meaning whatever accent is selected.
export const chartColors = {
  amethyst: "var(--chart-1)",
  cobalt: "var(--chart-2)",
  jade: "var(--chart-3)",
  amber: "var(--chart-4)",
  ruby: "var(--chart-5)",
  graphite: "var(--chart-6)",
} as const;

// Status colours match the status badges (done = Jade, in progress = Cobalt,
// to do = Graphite).
export const chartStatusColors = {
  done: chartColors.jade,
  in_progress: chartColors.cobalt,
  todo: chartColors.graphite,
} as const;

export const chartGridProps = {
  stroke: "var(--border)",
  strokeDasharray: "3 3",
  vertical: false,
} as const;

export const chartAxisProps = {
  stroke: "var(--border-strong)",
  tick: { fill: "var(--muted-foreground)" },
  tickLine: false,
} as const;

const tooltipContentStyle: CSSProperties = {
  background: "var(--popover)",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius-floating)",
  boxShadow: "var(--elevation-floating)",
  color: "var(--popover-foreground)",
  fontSize: "0.75rem",
};

export const chartTooltipProps = {
  contentStyle: tooltipContentStyle,
  itemStyle: { color: "var(--popover-foreground)" },
  labelStyle: { color: "var(--muted-foreground)", marginBottom: "0.25rem" },
} as const;
