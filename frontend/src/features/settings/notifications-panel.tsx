import { Bell } from "lucide-react";

import { FormError } from "@/components/form-error";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { useUpdateUserPreferences } from "@/features/settings/hooks";
import { SettingsSectionCard } from "@/features/settings/settings-section-card";
import type { UserPreferences } from "@/types/settings";

type NotificationKey =
  | "notify_activity_feed"
  | "notify_audit"
  | "notify_invitations"
  | "notify_comments"
  | "notify_assignments";

const notificationOptions: {
  key: NotificationKey;
  label: string;
  description: string;
}[] = [
  {
    key: "notify_activity_feed",
    label: "Activity Feed",
    description: "Événements importants de vos workspaces.",
  },
  {
    key: "notify_audit",
    label: "Audit",
    description: "Actions sensibles et changements de sécurité.",
  },
  {
    key: "notify_invitations",
    label: "Invitations",
    description: "Invitations reçues et changements de statut.",
  },
  {
    key: "notify_comments",
    label: "Commentaires",
    description: "Nouveaux échanges sur les tâches suivies.",
  },
  {
    key: "notify_assignments",
    label: "Assignations",
    description: "Tâches qui vous sont assignées ou retirées.",
  },
];

type NotificationsPanelProps = {
  preferences: UserPreferences;
  onSuccess: (message: string) => void;
};

export function NotificationsPanel({
  onSuccess,
  preferences,
}: NotificationsPanelProps) {
  const update = useUpdateUserPreferences();
  return (
    <SettingsSectionCard
      description="Choisissez les événements que TaskMiner doit signaler. Les canaux e-mail pourront réutiliser ces choix."
      icon={<Bell aria-hidden="true" className="text-primary size-5" />}
      title="Notifications"
    >
      <div className="space-y-1">
        {notificationOptions.map((option, index) => (
          <div key={option.key}>
            {index > 0 ? <Separator /> : null}
            <div className="flex items-center justify-between gap-5 py-4">
              <div>
                <p className="text-sm font-medium">{option.label}</p>
                <p className="text-muted-foreground text-sm">
                  {option.description}
                </p>
              </div>
              <Switch
                aria-label={`Notifications ${option.label}`}
                checked={preferences[option.key]}
                disabled={update.isPending}
                onCheckedChange={(checked) => {
                  void update
                    .mutateAsync({ [option.key]: checked })
                    .then(() => {
                      onSuccess("Préférence de notification enregistrée.");
                    })
                    .catch(() => undefined);
                }}
              />
            </div>
          </div>
        ))}
      </div>
      <FormError error={update.error} />
    </SettingsSectionCard>
  );
}
