import { NoticeToast } from "@/components/ui/notice-toast";

export type InvitationNotice = {
  message: string;
  type: "success" | "error";
};

type InvitationToastProps = {
  notice: InvitationNotice | null;
  onDismiss: () => void;
};

export function InvitationToast({ notice, onDismiss }: InvitationToastProps) {
  return <NoticeToast notice={notice} onDismiss={onDismiss} />;
}
