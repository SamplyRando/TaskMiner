import { ArrowRight } from "lucide-react";
import type { PropsWithChildren } from "react";
import { Link, useInRouterContext } from "react-router-dom";

type EmptyStateLinkProps = PropsWithChildren<{ to: string }>;

export function EmptyStateLink({ children, to }: EmptyStateLinkProps) {
  const isInRouter = useInRouterContext();
  const className =
    "bg-primary text-primary-foreground hover:bg-primary/90 inline-flex h-10 items-center justify-center gap-2 rounded-md px-4 text-sm font-medium shadow-xs transition-[background-color,box-shadow,transform] hover:shadow-md active:translate-y-px";
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
