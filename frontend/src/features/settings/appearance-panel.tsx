import { Check, MonitorCog, Palette } from "lucide-react";

import { FormError } from "@/components/form-error";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useUpdateUserPreferences } from "@/features/settings/hooks";
import { SettingsSectionCard } from "@/features/settings/settings-section-card";
import { cn } from "@/lib/utils";
import type {
  AccentPreference,
  ThemePreference,
  UserPreferences,
} from "@/types/settings";

const accents: {
  value: AccentPreference;
  label: string;
  className: string;
}[] = [
  { value: "violet", label: "Violet", className: "bg-violet-600" },
  { value: "blue", label: "Bleu", className: "bg-blue-600" },
  { value: "green", label: "Vert", className: "bg-emerald-600" },
  { value: "orange", label: "Orange", className: "bg-orange-600" },
];

type AppearancePanelProps = {
  preferences: UserPreferences;
  onSuccess: (message: string) => void;
};

export function AppearancePanel({
  onSuccess,
  preferences,
}: AppearancePanelProps) {
  const update = useUpdateUserPreferences();
  const save = async (data: Partial<UserPreferences>) => {
    try {
      await update.mutateAsync(data);
      onSuccess("Apparence enregistrée.");
    } catch {
      // React Query exposes the backend error below the controls.
    }
  };
  return (
    <SettingsSectionCard
      description="Personnalisez TaskMiner sans compromettre le contraste ni l’accessibilité."
      icon={<Palette aria-hidden="true" className="text-primary size-5" />}
      title="Apparence"
    >
      <div className="space-y-7">
        <label className="block max-w-sm space-y-2 text-sm font-medium">
          <span className="flex items-center gap-2">
            <MonitorCog aria-hidden="true" className="size-4" /> Thème
          </span>
          <Select
            disabled={update.isPending}
            onChange={(event) =>
              void save({ theme: event.target.value as ThemePreference })
            }
            value={preferences.theme}
          >
            <option value="system">Système</option>
            <option value="light">Clair</option>
            <option value="dark">Sombre</option>
          </Select>
        </label>
        <fieldset>
          <legend className="mb-3 text-sm font-medium">Couleur d’accent</legend>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {accents.map((accent) => (
              <button
                aria-pressed={preferences.accent === accent.value}
                className={cn(
                  "flex items-center gap-3 rounded-lg border p-3 text-sm font-medium transition-colors",
                  preferences.accent === accent.value &&
                    "border-primary ring-primary ring-1",
                )}
                disabled={update.isPending}
                key={accent.value}
                onClick={() => void save({ accent: accent.value })}
                type="button"
              >
                <span
                  className={cn(
                    "flex size-7 items-center justify-center rounded-full text-white",
                    accent.className,
                  )}
                >
                  {preferences.accent === accent.value ? (
                    <Check aria-hidden="true" className="size-4" />
                  ) : null}
                </span>
                {accent.label}
              </button>
            ))}
          </div>
        </fieldset>
        <div className="flex items-center justify-between gap-5 rounded-lg border p-4">
          <div>
            <p className="text-sm font-medium">Réduire les animations</p>
            <p className="text-muted-foreground text-sm">
              Limite les transitions en complément du réglage système.
            </p>
          </div>
          <Switch
            aria-label="Réduire les animations"
            checked={preferences.motion === "reduced"}
            disabled={update.isPending}
            onCheckedChange={(checked) =>
              void save({ motion: checked ? "reduced" : "full" })
            }
          />
        </div>
        <FormError error={update.error} />
      </div>
    </SettingsSectionCard>
  );
}
