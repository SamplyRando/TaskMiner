import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import { useConsentStore } from "@/store/consent-store";

type ConsentSettingsButtonProps = {
  children?: ReactNode;
  className?: string;
};

/**
 * Reopens the cookie choices. Offered on every page so that consent can be
 * withdrawn as easily as it was given.
 */
export function ConsentSettingsButton({
  children = "Gestion des cookies",
  className,
}: ConsentSettingsButtonProps) {
  const openPanel = useConsentStore((state) => state.openPanel);

  return (
    <button
      className={cn("cursor-pointer text-left", className)}
      onClick={openPanel}
      type="button"
    >
      {children}
    </button>
  );
}
