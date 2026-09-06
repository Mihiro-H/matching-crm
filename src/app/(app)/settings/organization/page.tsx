import { getOrganizationProfile } from "@/lib/settings/organization-profile";
import { OrganizationSettingsTab } from "@/components/settings/organization-settings-tab";
import { isSupabaseConfigured } from "@/lib/supabase/server";

export default async function SettingsOrganizationPage() {
  if (!isSupabaseConfigured()) {
    return (
      <div className="rounded-lg border border-neutral-200 bg-neutral-0 p-8">
        <h2 className="text-lg text-neutral-900">Supabase未接続です</h2>
        <p className="mt-2 text-sm text-neutral-600">
          Supabaseの接続情報を .env に設定すると、設定内容が表示されます。
        </p>
      </div>
    );
  }

  const profile = await getOrganizationProfile();

  return <OrganizationSettingsTab initial={profile} />;
}
