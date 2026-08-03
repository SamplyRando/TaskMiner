import { NoticeToast } from "@/components/ui/notice-toast";

export type SettingsNotice = {
  message: string;
  type: "success" | "error";
};

type SettingsToastProps = {
  notice: SettingsNotice | null;
  onDismiss: () => void;
};

export function SettingsToast({ notice, onDismiss }: SettingsToastProps) {
  return (
    <NoticeToast dismissLabel="Fermer" notice={notice} onDismiss={onDismiss} />
  );
}
