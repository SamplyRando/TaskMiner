import { cn } from "@/lib/utils";

type FacetProps = {
  className?: string;
  /** Accessible name. Without it the glyph is decorative (aria-hidden). */
  label?: string;
  /** brand: always Améthyste; current: inherits the text colour. */
  tone?: "brand" | "current" | "muted";
};

const toneClasses = {
  brand: "text-brand",
  current: "",
  muted: "text-muted-foreground",
} as const;

/**
 * The « Facette » signature: a plane cut at 45° on its top-left corner, with
 * the detached shard. The cut sits top-left on purpose so it never reads as a
 * folded document corner.
 * Reserved for identity moments (brand, TaskMiner AI, empty states, landing);
 * keep it rare and small rather than using it as decoration.
 */
export function Facet({ className, label, tone = "brand" }: FacetProps) {
  return (
    <svg
      aria-hidden={label ? undefined : true}
      aria-label={label}
      className={cn("size-4 shrink-0", toneClasses[tone], className)}
      fill="none"
      focusable="false"
      role={label ? "img" : undefined}
      viewBox="0 0 16 16"
    >
      <path d="M7 2h7v12H2V7Z" fill="currentColor" />
      <path d="M1.5 1.5H5L1.5 5Z" fill="currentColor" opacity={0.45} />
    </svg>
  );
}
