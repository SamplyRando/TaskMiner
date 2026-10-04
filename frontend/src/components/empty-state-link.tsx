import { ArrowRight } from "lucide-react";
import type { PropsWithChildren } from "react";
import { Link, useInRouterContext } from "react-router-dom";

import { buttonVariants } from "@/components/ui/button-variants";

type EmptyStateLinkProps = PropsWithChildren<{ to: string }>;

export function EmptyStateLink({ children, to }: EmptyStateLinkProps) {
  const isInRouter = useInRouterContext();
  const className = buttonVariants();
  const content = (
    <>
      {children}
      <ArrowRight aria-hidden="true" className="size-4" />
    </>
  );

  if (!isInRouter) {
    return (
      <a className={className} href={to}>
        {content}
      </a>
    );
  }

  return (
    <Link className={className} to={to}>
      {content}
    </Link>
  );
}
