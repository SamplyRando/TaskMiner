import {
  settingsSections,
  type SettingsSection,
} from "@/features/settings/settings-sections";
import { cn } from "@/lib/utils";

type SettingsNavProps = {
  active: SettingsSection;
  onChange: (section: SettingsSection) => void;
};

export function SettingsNav({ active, onChange }: SettingsNavProps) {
  return (
    <nav
      aria-label="Sections des paramètres"
      className="max-w-full overflow-x-auto pb-1 lg:pb-0"
    >
      <div className="flex min-w-max gap-1 lg:min-w-0 lg:flex-col lg:gap-0.5">
        {settingsSections.map(({ icon: Icon, id, label }) => {
          const isActive = active === id;
          return (
            <button
              aria-current={isActive ? "page" : undefined}
              className={cn(
                // Same subtle active state as the main sidebar: tinted row and
                // a thin accent bar on desktop instead of a solid fill.
                "relative flex min-h-9 shrink-0 items-center gap-2.5 rounded-md px-3 py-2 text-left text-sm font-medium transition-colors lg:w-full pointer-coarse:min-h-11",
                id === "danger" && "lg:mt-3",
                isActive
                  ? "bg-primary-subtle text-foreground lg:before:bg-primary lg:before:absolute lg:before:inset-y-2 lg:before:left-0 lg:before:w-0.5 lg:before:rounded-full"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground",
              )}
              key={id}
              onClick={() => {
                onChange(id);
              }}
              type="button"
            >
              <Icon
                aria-hidden="true"
                className={cn(
                  "size-4 shrink-0",
                  isActive &&
                    (id === "danger" ? "text-destructive" : "text-primary"),
                )}
              />
              {label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
