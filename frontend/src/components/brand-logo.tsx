import { Link } from "react-router-dom";

import { cn } from "@/lib/utils";

type BrandLogoProps = {
  className?: string;
  compact?: boolean;
  onClick?: () => void;
  to?: string;
};

export function BrandMark({ className }: Pick<BrandLogoProps, "className">) {
  return (
    <svg
      aria-hidden="true"
      className={cn("size-9 shrink-0", className)}
      fill="none"
      viewBox="0 0 40 40"
    >
      <rect fill="currentColor" height="40" rx="12" width="40" />
      <path
        d="M11 12.5h18M20 12.5v15M14.5 18h11"
        stroke="white"
        strokeLinecap="round"
        strokeWidth="3.25"
      />
      <path
        d="m25.5 24 2 2 4-5"
        stroke="white"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2.25"
      />
    </svg>
  );
}

export function BrandLogo({
  className,
  compact = false,
  onClick,
  to = "/app",
}: BrandLogoProps) {
  return (
    <Link
      aria-label="TaskMiner — Accueil"
      className={cn(
        "text-primary inline-flex items-center gap-2.5 rounded-lg font-extrabold tracking-tight",
        className,
      )}
      onClick={onClick}
      to={to}
    >
      <BrandMark />
      {compact ? null : (
        <span className="text-foreground text-lg">TaskMiner</span>
      )}
    </Link>
  );
}
