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
  /** duplicate_person_email専用: 通知タップ時の遷移先(新規作成された担当者の詳細)。 */
  personId?: string;
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

  // Slack本文・アプリ内通知の遷移先・メンションのいずれでも使うため、先に1回だけ解決する。
  const [linkPath, recipientUserIds] = await Promise.all([
    resolveNotificationLinkPath(admin, eventType, context),
    resolveNotificationRecipients(admin, eventType, context),
  ]);

  const { data: setting } = await admin
    .from("notification_settings")
    .select("slack_channel_id, message_template, is_active")
    .eq("event_type", eventType)
    .maybeSingle();

  if (setting?.is_active) {
    // {{url}}は対象ページへの絶対URL(NEXT_PUBLIC_SITE_URL + linkPath)。
    // 遷移先が無いイベント、またはNEXT_PUBLIC_SITE_URL未設定の場合は空文字にする
    // (相対パスだけの壊れたリンクをSlackに貼らないため)。
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
    const url = linkPath && siteUrl ? `${siteUrl}${linkPath}` : "";
    // {{mentions}}は通知対象ユーザー(resolveNotificationRecipients)のうち、
    // Slack ID(users.slack_user_id、設定 > ユーザー管理で登録)が設定されている人だけを
    // Slackのメンション形式(<@ID>)にしたもの。誰も設定していなければ空文字になる。
    const mentions = await resolveSlackMentions(admin, recipientUserIds);
    const text = renderMessageTemplate(setting.message_template, { ...placeholders, url, mentions });
    await sendSlackMessage(setting.slack_channel_id, text);
  }

  if (recipientUserIds.length === 0) return;

  const title = renderNotificationTitle(eventType, placeholders);

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
 * 通知対象ユーザーのうち、Slack IDが設定されている人だけをSlackのメンション形式
 * (<@ID>)にしてスペース区切りで返す({{mentions}}プレースホルダー用)。
 */
async function resolveSlackMentions(admin: SupabaseAdminClient, userIds: string[]): Promise<string> {
  if (userIds.length === 0) return "";
  const { data } = await admin.from("users").select("slack_user_id").in("id", userIds);
  return (data ?? [])
    .map((row) => row.slack_user_id)
    .filter((id): id is string => !!id)
    .map((id) => `<@${id}>`)
    .join(" ");
}

/**
 * 通知対象ユーザーの解決ルール:
 * - new_lead/duplicate_person_email: まだ案件が存在しない問い合わせ時点のイベントのため、
 *   事前に指名された案件振り分け担当者(users.is_lead_distributor)に通知する
 *   (duplicate_person_emailは特定の商談・案件に紐づかない担当者データの話のため、
 *   問い合わせ対応の窓口である案件振り分け担当者に判断を委ねる)
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
  if (eventType === "new_lead" || eventType === "duplicate_person_email") {
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
  if (eventType === "duplicate_person_email") {
    // 担当者一覧(SCREEN_SPEC.md)はuuidをそのままURLに使う(deals/projectsと違い
    // 短縮連番を持たない、resolve-form-id.ts等と同じ理由での使い分け)。
    return context.personId ? `/people/${context.personId}` : null;
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
