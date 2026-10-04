import { Bell } from "lucide-react";

import { FormError } from "@/components/form-error";
import { Separator } from "@/components/ui/separator";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useUpdateUserPreferences } from "@/features/settings/hooks";
import { SettingsSectionCard } from "@/features/settings/settings-section-card";
import type { UserPreferences } from "@/types/settings";

type NotificationKey =
  | "notify_activity_feed"
  | "notify_audit"
  | "notify_invitations"
  | "notify_comments"
  | "notify_assignments"
  | "notify_task_reminders"
  | "notify_project_reminders";

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
  {
    key: "notify_task_reminders",
    label: "Échéances des tâches",
    description: "Rappels pour les tâches qui vous sont assignées.",
  },
  {
    key: "notify_project_reminders",
    label: "Échéances des projets",
    description: "Rappels pour les projets dont vous êtes responsable.",
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
            <div className="flex items-center justify-between gap-4 py-4">
              <div className="min-w-0">
                <p className="text-sm font-medium">{option.label}</p>
                <p className="text-muted-foreground text-sm">
                  {option.description}
                </p>
              </div>
              <Switch
                className="shrink-0"
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
      <Separator />
      <div className="flex flex-col gap-2 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div>
          <label className="text-sm font-medium" htmlFor="reminder-lead-days">
            Délai des rappels
          </label>
          <p className="text-muted-foreground text-sm">
            Recevoir le rappel avant la date d’échéance.
          </p>
        </div>
        <Select
          className="w-full sm:w-44"
          disabled={update.isPending}
          id="reminder-lead-days"
          onChange={(event) => {
            const leadDays = Number(event.target.value) as 1 | 2 | 3 | 7;
            void update
              .mutateAsync({ reminder_lead_days: leadDays })
              .then(() => {
                onSuccess("Délai de rappel enregistré.");
              })
              .catch(() => undefined);
          }}
          value={preferences.reminder_lead_days}
        >
          <option value={1}>1 jour avant</option>
          <option value={2}>2 jours avant</option>
          <option value={3}>3 jours avant</option>
          <option value={7}>7 jours avant</option>
        </Select>
      </div>
      <FormError error={update.error} />
    </SettingsSectionCard>
  );
}
