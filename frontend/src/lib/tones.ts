// Semantic tones of the « Facette » system. Statuses, priorities, audit events
// and badges map to a tone instead of a raw Tailwind palette colour, so light
// and dark themes stay consistent everywhere.
export type Tone =
  "brand" | "danger" | "info" | "neutral" | "success" | "warning";

export const toneBadgeClasses: Record<Tone, string> = {
  brand: "border-brand-border bg-brand-subtle text-brand",
  danger: "border-destructive-border bg-destructive-subtle text-destructive",
  info: "border-info-border bg-info-subtle text-info",
  neutral: "border-border-strong bg-surface-sunken text-muted-foreground",
  success: "border-success-border bg-success-subtle text-success",
  warning: "border-warning-border bg-warning-subtle text-warning",
};

export const toneTextClasses: Record<Tone, string> = {
  brand: "text-brand",
  danger: "text-destructive",
  info: "text-info",
  neutral: "text-muted-foreground",
  success: "text-success",
  warning: "text-warning",
};

export const toneDotClasses: Record<Tone, string> = {
  brand: "bg-brand",
  danger: "bg-destructive",
  info: "bg-info",
  neutral: "bg-muted-foreground",
  success: "bg-success",
  warning: "bg-warning",
};
