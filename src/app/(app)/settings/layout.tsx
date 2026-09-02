import { SettingsTabs } from "@/components/settings/settings-tabs";
import { requireAdminPageAccess } from "@/lib/auth/page-access";
import { isSupabaseConfigured } from "@/lib/supabase/server";

// SCREEN_SPEC.md: settingsはrole='admin'限定(ページ権限に関わらず)。
export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  if (isSupabaseConfigured()) {
    await requireAdminPageAccess();
  }

  return (
    <div className="flex flex-col gap-4">
      <SettingsTabs />
      {children}
    </div>
  );
}
