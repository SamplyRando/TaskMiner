import { Gauge, LayoutList } from "lucide-react";

import { FormError } from "@/components/form-error";
import { Select } from "@/components/ui/select";
import { useUpdateUserPreferences } from "@/features/settings/hooks";
import { SettingsSectionCard } from "@/features/settings/settings-section-card";
import type {
  DashboardPeriod,
  ItemsPerPage,
  UserPreferences,
} from "@/types/settings";

type PreferencesPanelProps = {
  preferences: UserPreferences;
  onSuccess: (message: string) => void;
};

export function PreferencesPanel({
  onSuccess,
  preferences,
}: PreferencesPanelProps) {
  const update = useUpdateUserPreferences();
  const save = async (
    data: Partial<Pick<UserPreferences, "dashboard_period" | "items_per_page">>,
  ) => {
    try {
      await update.mutateAsync(data);
      onSuccess("Préférences enregistrées.");
    } catch {
      // React Query exposes the backend error below the controls.
    }
  };

  return (
    <SettingsSectionCard
      description="Adaptez la densité des listes et la période initiale de vos analyses."
      title="Préférences d’utilisation"
    >
      <div className="grid gap-6 md:grid-cols-2">
        <label className="space-y-2 text-sm font-medium">
          <span className="flex items-center gap-2">
            <LayoutList aria-hidden="true" className="text-primary size-4" />
            Éléments par page
          </span>
          <Select
            disabled={update.isPending}
            onChange={(event) =>
              void save({
                items_per_page: Number(event.target.value) as ItemsPerPage,
              })
            }
            value={preferences.items_per_page}
          >
            {[10, 20, 50, 100].map((value) => (
              <option key={value} value={value}>
                {value} éléments
              </option>
            ))}
          </Select>
          <span className="text-muted-foreground block text-xs">
            Utilisé comme valeur par défaut dans les listes paginées.
          </span>
        </label>
        <label className="space-y-2 text-sm font-medium">
          <span className="flex items-center gap-2">
            <Gauge aria-hidden="true" className="text-primary size-4" />
            Période du dashboard
          </span>
          <Select
            disabled={update.isPending}
            onChange={(event) =>
              void save({
                dashboard_period: Number(event.target.value) as DashboardPeriod,
              })
            }
            value={preferences.dashboard_period}
          >
            {[7, 30, 90].map((value) => (
              <option key={value} value={value}>
                {value} jours
              </option>
            ))}
          </Select>
          <span className="text-muted-foreground block text-xs">
            Le prochain chargement du dashboard utilisera cette période.
          </span>
        </label>
      </div>
      <div className="mt-4">
        <FormError error={update.error} />
      </div>
    </SettingsSectionCard>
  );
}
