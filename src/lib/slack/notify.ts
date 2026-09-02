import "server-only";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { sendSlackMessage } from "./send-message";
import { renderMessageTemplate } from "./template";
import type { NotificationEventType } from "@/lib/supabase/database.types";

/**
 * notification_settings(DB_SCHEMA.md)に基づき、イベント発生時にSlack通知を送る。
 * is_active=falseの場合は何もしない。Webhookハンドラから呼ばれるため、
 * RLSを回避できるadminクライアントでnotification_settingsを読む。
 */
export async function triggerNotification(
  eventType: NotificationEventType,
  placeholders: Record<string, string>
): Promise<void> {
  const admin = createSupabaseAdminClient();
  const { data: setting } = await admin
    .from("notification_settings")
    .select("slack_channel_id, message_template, is_active")
    .eq("event_type", eventType)
    .maybeSingle();

  if (!setting || !setting.is_active) return;

  const text = renderMessageTemplate(setting.message_template, placeholders);
  await sendSlackMessage(setting.slack_channel_id, text);
}
