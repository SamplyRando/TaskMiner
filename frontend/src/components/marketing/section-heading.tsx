import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type SectionHeadingProps = {
  children: ReactNode;
  description?: string;
  eyebrow: string;
  reveal?: boolean;
};

export function SectionHeading({
  children,
  description,
  eyebrow,
  reveal = false,
}: SectionHeadingProps) {
  return (
    <header
      className={cn("marketing-section-heading", {
        "marketing-motion-reveal marketing-motion-reveal--blur marketing-motion-reveal--up":
          reveal,
      })}
      data-marketing-anchor-target
      data-marketing-reveal={reveal ? "" : undefined}
      tabIndex={-1}
    >
      <p>{eyebrow}</p>
      <h2>{children}</h2>
      {description ? <span>{description}</span> : null}
    </header>
  );
}
