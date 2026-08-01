import { CheckCircle2, X, XCircle } from "lucide-react";

import { Button } from "@/components/ui/button";

export type InvitationNotice = {
  message: string;
  type: "success" | "error";
};

type InvitationToastProps = {
  notice: InvitationNotice | null;
  onDismiss: () => void;
};

export function InvitationToast({ notice, onDismiss }: InvitationToastProps) {
  if (!notice) {
    return null;
  }

  const Icon = notice.type === "success" ? CheckCircle2 : XCircle;

  return (
    <div
      aria-live="polite"
      className="fixed right-4 bottom-4 z-60 flex max-w-sm items-center gap-3 rounded-xl border bg-white px-4 py-3 shadow-lg"
      role={notice.type === "error" ? "alert" : "status"}
    >
      <Icon
        aria-hidden="true"
        className={
          notice.type === "success" ? "text-emerald-600" : "text-destructive"
        }
      />
      <p className="flex-1 text-sm font-medium">{notice.message}</p>
      <Button
        aria-label="Fermer la notification"
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
