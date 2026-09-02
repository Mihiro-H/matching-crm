"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { NOTIFICATION_EVENT_TYPES, type NotificationSettingRow } from "./notification-event-types";

/** 通知設定(SCREEN_SPEC.md 10章 9-1)。未作成のイベント種別は空の設定として返す。 */
export async function getNotificationSettings(): Promise<{
  settings: NotificationSettingRow[];
  error: string | null;
}> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("notification_settings")
    .select("event_type, slack_channel_id, message_template, is_active");

  if (error) {
    return { settings: [], error: error.message };
  }

  const byEventType = new Map((data ?? []).map((row) => [row.event_type, row]));

  return {
    settings: NOTIFICATION_EVENT_TYPES.map(({ key }) => {
      const existing = byEventType.get(key);
      return {
        eventType: key,
        slackChannelId: existing?.slack_channel_id ?? "",
        messageTemplate: existing?.message_template ?? "",
        isActive: existing?.is_active ?? false,
      };
    }),
    error: null,
  };
}
