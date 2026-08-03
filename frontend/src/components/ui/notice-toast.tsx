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
      className="toast-arrival bg-card fixed right-4 bottom-4 left-4 z-60 flex items-center gap-3 rounded-xl border px-4 py-3 shadow-xl sm:left-auto sm:max-w-sm"
      role={notice.type === "error" ? "alert" : "status"}
    >
      <Icon
        aria-hidden="true"
        className={cn("size-5 shrink-0", {
          "text-destructive": notice.type === "error",
          "text-primary": notice.type === "info",
          "text-emerald-600": notice.type === "success",
        })}
      />
      <p className="flex-1 text-sm font-medium">{notice.message}</p>
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
