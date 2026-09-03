import "server-only";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { sendSlackMessage } from "./send-message";
import { renderMessageTemplate } from "./template";
import { renderNotificationTitle } from "@/lib/notifications/render-title";
import type { NotificationEventType } from "@/lib/supabase/database.types";

export type NotificationContext = {
  /** 案件に紐づくイベント(contract_signed/payment_confirmed/reminder)の通知先解決に使う */
  projectId?: string;
  /** new_leadの通知タップ時の遷移先(問い合わせ詳細)に使う */
  contactId?: string;
};

/**
 * イベント発生時にSlack通知 + アプリ内通知(ヘッダーのベル)の両方を送る。
 *
 * Slack: notification_settings(DB_SCHEMA.md)に基づく。is_active=falseなら何もしない。
 * アプリ内通知: 対象ユーザーを解決してnotificationsに1行ずつ書き込む
 * (通知対象ルールは resolveNotificationRecipients 参照)。
 *
 * Webhookハンドラから呼ばれるため、RLSを回避できるadminクライアントを使う。
 */
export async function triggerNotification(
  eventType: NotificationEventType,
  placeholders: Record<string, string>,
  context: NotificationContext = {}
): Promise<void> {
  const admin = createSupabaseAdminClient();

  const { data: setting } = await admin
    .from("notification_settings")
    .select("slack_channel_id, message_template, is_active")
    .eq("event_type", eventType)
    .maybeSingle();

  if (setting?.is_active) {
    const text = renderMessageTemplate(setting.message_template, placeholders);
    await sendSlackMessage(setting.slack_channel_id, text);
  }

  const recipientUserIds = await resolveNotificationRecipients(admin, eventType, context);
  if (recipientUserIds.length === 0) return;

  const title = renderNotificationTitle(eventType, placeholders);
  const linkPath = resolveNotificationLinkPath(eventType, context);

  await admin.from("notifications").insert(
    recipientUserIds.map((userId) => ({
      user_id: userId,
      event_type: eventType,
      title,
      link_path: linkPath,
    }))
  );
}

type SupabaseAdminClient = ReturnType<typeof createSupabaseAdminClient>;

/**
 * 通知対象ユーザーの解決ルール:
 * - new_lead: まだ案件が存在しない問い合わせイベントのため、事前に指名された
 *   案件振り分け担当者(users.is_lead_distributor)に通知する
 * - それ以外(contract_signed/payment_confirmed/reminder): 対象案件の担当者
 *   (project_assignees: 主担当+副担当)に通知する
 */
async function resolveNotificationRecipients(
  admin: SupabaseAdminClient,
  eventType: NotificationEventType,
  context: NotificationContext
): Promise<string[]> {
  if (eventType === "new_lead") {
    const { data } = await admin.from("users").select("id").eq("is_lead_distributor", true);
    return (data ?? []).map((row) => row.id);
  }

  if (!context.projectId) return [];
  const { data } = await admin
    .from("project_assignees")
    .select("user_id")
    .eq("project_id", context.projectId);
  return (data ?? []).map((row) => row.user_id);
}

function resolveNotificationLinkPath(
  eventType: NotificationEventType,
  context: NotificationContext
): string | null {
  if (eventType === "new_lead") {
    return context.contactId ? `/contacts/${context.contactId}` : null;
  }
  return context.projectId ? `/projects/${context.projectId}` : null;
}
