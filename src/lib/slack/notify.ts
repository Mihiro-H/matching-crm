import "server-only";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { sendSlackMessage } from "./send-message";
import { renderMessageTemplate } from "./template";
import { renderNotificationTitle } from "@/lib/notifications/render-title";
import type { NotificationEventType } from "@/lib/supabase/database.types";

export type NotificationContext = {
  /** 案件に紐づくイベント(contract_signed/payment_confirmed/reminder)の通知先解決に使う */
  projectId?: string;
  /**
   * new_leadの通知タップ時の遷移先(商談詳細)に使う。
   * reminderでも、商談に紐づく通知(見積提出後の停滞リマインドなど)は
   * projectIdより優先してこちらで通知先・遷移先を解決する(商談の主担当+サブ担当)。
   */
  dealId?: string;
  /**
   * meeting_note_ready/meeting_note_failed専用: 対象を「アップロードした本人」1人に
   * 固定する(議事録アップロードは個人作業で、案件・商談の担当者全員宛にする必要が
   * ないため。upload-actions.ts/complete-upload.ts参照)。
   */
  uploadedByUserId?: string;
  /** meeting_note_readyの通知タップ時の遷移先(作成された議事録の詳細) */
  meetingNoteId?: string;
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
  const linkPath = await resolveNotificationLinkPath(admin, eventType, context);

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
 * - meeting_note_ready/meeting_note_failed: アップロードした本人1人にのみ通知する
 * - dealIdが渡された場合(reminder: 見積提出後の停滞リマインドなど): 対象商談の
 *   主担当(assigned_user_id)+サブ担当(deal_assignees)に通知する
 * - それ以外(contract_signed/payment_confirmed/reminderで案件のみ紐づく場合):
 *   対象案件の担当者(project_assignees: 主担当+副担当)に通知する
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

  if (eventType === "meeting_note_ready" || eventType === "meeting_note_failed") {
    return context.uploadedByUserId ? [context.uploadedByUserId] : [];
  }

  if (context.dealId) {
    const [{ data: deal }, { data: secondaries }] = await Promise.all([
      admin.from("deals").select("assigned_user_id").eq("id", context.dealId).maybeSingle(),
      admin.from("deal_assignees").select("user_id").eq("deal_id", context.dealId),
    ]);
    const userIds = new Set<string>();
    if (deal?.assigned_user_id) userIds.add(deal.assigned_user_id);
    for (const row of secondaries ?? []) userIds.add(row.user_id);
    return [...userIds];
  }

  if (!context.projectId) return [];
  const { data } = await admin
    .from("project_assignees")
    .select("user_id")
    .eq("project_id", context.projectId);
  return (data ?? []).map((row) => row.user_id);
}

/**
 * 通知の遷移先URL。商談・案件のURLは短い連番(number)を使う(SCREEN_SPEC.md「URLを短く
 * する」対応)ため、uuidのid(context.dealId/projectId)からnumberを都度引き直す。
 */
async function resolveNotificationLinkPath(
  admin: SupabaseAdminClient,
  eventType: NotificationEventType,
  context: NotificationContext
): Promise<string | null> {
  if (eventType === "new_lead") {
    if (!context.dealId) return null;
    const number = await getDealNumber(admin, context.dealId);
    return number !== null ? `/deals/${number}` : null;
  }
  if (eventType === "meeting_note_ready") {
    return context.meetingNoteId ? `/meeting-notes/${context.meetingNoteId}` : null;
  }
  if (eventType === "meeting_note_failed") {
    return "/meeting-notes/upload";
  }
  if (context.dealId) {
    const number = await getDealNumber(admin, context.dealId);
    return number !== null ? `/deals/${number}` : null;
  }
  if (context.projectId) {
    const number = await getProjectNumber(admin, context.projectId);
    return number !== null ? `/projects/${number}` : null;
  }
  return null;
}

async function getDealNumber(admin: SupabaseAdminClient, dealId: string): Promise<number | null> {
  const { data } = await admin.from("deals").select("number").eq("id", dealId).maybeSingle();
  return data?.number ?? null;
}

async function getProjectNumber(admin: SupabaseAdminClient, projectId: string): Promise<number | null> {
  const { data } = await admin.from("projects").select("number").eq("id", projectId).maybeSingle();
  return data?.number ?? null;
}
