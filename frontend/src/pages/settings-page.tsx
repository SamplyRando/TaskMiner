import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";

import { ErrorState } from "@/components/error-state";
import { AppearancePanel } from "@/features/settings/appearance-panel";
import { DangerZone } from "@/features/settings/danger-zone";
import {
  useSettingsProfile,
  useUserPreferences,
} from "@/features/settings/hooks";
import { NotificationsPanel } from "@/features/settings/notifications-panel";
import { PreferencesPanel } from "@/features/settings/preferences-panel";
import { ProfilePanel } from "@/features/settings/profile-panel";
import { SecurityPanel } from "@/features/settings/security-panel";
import { SettingsNav } from "@/features/settings/settings-nav";
import {
  settingsSections,
  type SettingsSection,
} from "@/features/settings/settings-sections";
import { SettingsSkeleton } from "@/features/settings/settings-skeleton";
import {
  SettingsToast,
  type SettingsNotice,
} from "@/features/settings/settings-toast";

export function SettingsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [notice, setNotice] = useState<SettingsNotice | null>(null);
  const profile = useSettingsProfile();
  const preferences = useUserPreferences();
  const activeSection = useMemo<SettingsSection>(() => {
    const requested = searchParams.get("section");
    return settingsSections.some((section) => section.id === requested)
      ? (requested as SettingsSection)
      : "profile";
  }, [searchParams]);
  const showSuccess = (message: string) => {
    setNotice({ message, type: "success" });
  };

  const content = (() => {
    if (profile.isPending || preferences.isPending) return <SettingsSkeleton />;
    if (profile.isError || preferences.isError) {
      return (
        <ErrorState
          error={profile.error ?? preferences.error}
          onRetry={() => {
            void Promise.all([profile.refetch(), preferences.refetch()]);
          }}
        />
      );
    }
    switch (activeSection) {
      case "profile":
        return <ProfilePanel onSuccess={showSuccess} profile={profile.data} />;
      case "security":
        return <SecurityPanel onSuccess={showSuccess} />;
      case "preferences":
        return (
          <PreferencesPanel
            onSuccess={showSuccess}
            preferences={preferences.data}
          />
        );
      case "notifications":
        return (
          <NotificationsPanel
            onSuccess={showSuccess}
            preferences={preferences.data}
          />
        );
      case "appearance":
        return (
          <AppearancePanel
            onSuccess={showSuccess}
            preferences={preferences.data}
          />
        );
      case "danger":
        return <DangerZone />;
    }
  })();

  return (
    <div className="space-y-6">
      <header>
        <p className="text-primary text-sm font-semibold">Votre compte</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">Paramètres</h1>
        <p className="text-muted-foreground mt-2 max-w-2xl">
          Gérez votre profil, votre sécurité et votre expérience TaskMiner.
        </p>
      </header>
      <div className="grid gap-6 lg:grid-cols-[14rem_minmax(0,1fr)]">
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <SettingsNav
            active={activeSection}
            onChange={(section) => {
              setSearchParams({ section });
            }}
          />
        </aside>
        <section aria-live="polite" className="min-w-0">
          {content}
        </section>
      </div>
      <SettingsToast
        notice={notice}
        onDismiss={() => {
          setNotice(null);
        }}
      />
    </div>
  );
}
