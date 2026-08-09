import type { ReactNode } from "react";

type SectionHeadingProps = {
  children: ReactNode;
  description?: string;
  eyebrow: string;
};

export function SectionHeading({
  children,
  description,
  eyebrow,
}: SectionHeadingProps) {
  return (
    <header className="marketing-section-heading">
      <p>{eyebrow}</p>
      <h2>{children}</h2>
      {description ? <span>{description}</span> : null}
    </header>
  );
}
