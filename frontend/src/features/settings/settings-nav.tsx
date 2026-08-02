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
    <nav aria-label="Sections des paramètres" className="overflow-x-auto">
      <div className="flex min-w-max gap-1 lg:min-w-0 lg:flex-col">
        {settingsSections.map(({ icon: Icon, id, label }) => (
          <button
            aria-current={active === id ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors",
              active === id
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
            )}
            key={id}
            onClick={() => {
              onChange(id);
            }}
            type="button"
          >
            <Icon aria-hidden="true" className="size-4" />
            {label}
          </button>
        ))}
      </div>
    </nav>
  );
}
