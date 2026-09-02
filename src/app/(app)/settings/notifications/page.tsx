import { getNotificationSettings } from "@/lib/settings/notification-settings";
import { NotificationSettingsTab } from "@/components/settings/notification-settings-tab";
import { isSupabaseConfigured } from "@/lib/supabase/server";

export default async function SettingsNotificationsPage() {
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

  const { settings, error } = await getNotificationSettings();

  if (error) {
    return <p className="text-sm text-danger-text">設定の取得に失敗しました: {error}</p>;
  }

  return <NotificationSettingsTab initial={settings} />;
}
