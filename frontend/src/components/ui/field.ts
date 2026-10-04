// Shared recipe for text fields, native selects and textareas: 3:1 boundary
// (WCAG 1.4.11), accent focus halo, invalid and disabled states, and 16 px
// text on touch screens so iOS Safari does not zoom on focus.
export const fieldClassName =
  "border-input bg-surface text-foreground shadow-xs rounded-control hover:border-input-hover focus-visible:border-ring focus-visible:ring-ring/30 aria-invalid:border-destructive aria-invalid:hover:border-destructive aria-invalid:focus-visible:ring-destructive/25 disabled:bg-muted disabled:hover:border-input w-full min-w-0 border text-sm transition-[border-color,box-shadow,background-color] duration-150 focus-visible:ring-[3px] focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-60 pointer-coarse:text-base";
