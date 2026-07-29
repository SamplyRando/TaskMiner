import { LoaderCircle } from "lucide-react";

import { cn } from "@/lib/utils";

type SpinnerProps = {
  className?: string;
  label?: string;
};

export function Spinner({
  className,
  label = "Chargement en cours",
}: SpinnerProps) {
  return (
    <span className="inline-flex items-center gap-2" role="status">
      <LoaderCircle
        aria-hidden="true"
        className={cn("size-4 animate-spin", className)}
      />
      <span className="sr-only">{label}</span>
    </span>
  );
}
