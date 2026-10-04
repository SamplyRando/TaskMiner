import { CheckCircle2, Info, X, XCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type Notice = {
  message: string;
  type: "error" | "info" | "success";
};

type NoticeToastProps = {
  dismissLabel?: string;
  notice: Notice | null;
  onDismiss: () => void;
};

const iconByType = {
  error: XCircle,
  info: Info,
  success: CheckCircle2,
};

const iconClassByType = {
  error: "text-destructive",
  info: "text-info",
  success: "text-success",
};

export function NoticeToast({
  dismissLabel = "Fermer la notification",
  notice,
  onDismiss,
}: NoticeToastProps) {
  if (!notice) return null;
  const Icon = iconByType[notice.type];

  return (
    <div
      aria-live="polite"
      className="toast-arrival bg-popover text-popover-foreground rounded-floating shadow-floating fixed right-4 bottom-[max(1rem,env(safe-area-inset-bottom))] left-4 z-60 flex items-center gap-3 border py-2 pr-2 pl-4 sm:left-auto sm:max-w-sm"
      role={notice.type === "error" ? "alert" : "status"}
    >
      <Icon
        aria-hidden="true"
        className={cn("size-5 shrink-0", iconClassByType[notice.type])}
      />
      <p className="flex-1 py-1 text-sm font-medium">{notice.message}</p>
      <Button
        aria-label={dismissLabel}
        onClick={onDismiss}
        size="icon"
        type="button"
        variant="ghost"
      >
        <X aria-hidden="true" className="size-4" />
      </Button>
    </div>
  );
}
