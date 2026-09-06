import type { NotificationEventType } from "@/lib/supabase/database.types";

/**
 * {{url}}はSlack通知本文専用の共通プレースホルダー(対象ページへの絶対URL、
 * slack/notify.tsのtriggerNotificationがlinkPathから自動で埋め込む)。
 * 遷移先が無いイベント、またはNEXT_PUBLIC_SITE_URL未設定の場合は空文字になる。
 * アプリ内通知(ベル)は別途notifications.link_pathで遷移先を持つため、
 * タイトル文言(render-title.ts)には含めない。
 */
const URL_PLACEHOLDER = "{{url}}";
/**
 * {{mentions}}もSlack通知本文専用の共通プレースホルダー。通知対象ユーザー
 * (slack/notify.tsのresolveNotificationRecipients)のうち、Slack ID(設定 > ユーザー管理で
 * 登録)が設定されている人をSlackのメンション形式(<@ID>)にしたもの。
 * 誰も設定していなければ空文字になる。
 */
const MENTIONS_PLACEHOLDER = "{{mentions}}";
const COMMON_PLACEHOLDERS = [URL_PLACEHOLDER, MENTIONS_PLACEHOLDER];

export const NOTIFICATION_EVENT_TYPES: { key: NotificationEventType; label: string; placeholders: string[] }[] = [
  { key: "new_lead", label: "新規問い合わせ", placeholders: ["{{company_name}}", ...COMMON_PLACEHOLDERS] },
  {
    key: "contract_signed",
    label: "契約締結",
    placeholders: ["{{company_name}}", "{{project_title}}", ...COMMON_PLACEHOLDERS],
  },
  {
    key: "payment_confirmed",
    label: "入金確認",
    placeholders: ["{{company_name}}", "{{project_title}}", "{{amount}}", ...COMMON_PLACEHOLDERS],
  },
  {
    key: "reminder",
    label: "リマインド",
    placeholders: ["{{company_name}}", "{{project_title}}", ...COMMON_PLACEHOLDERS],
  },
  { key: "meeting_note_ready", label: "議事録作成完了", placeholders: ["{{title}}", ...COMMON_PLACEHOLDERS] },
  { key: "meeting_note_failed", label: "議事録作成失敗", placeholders: ["{{title}}", ...COMMON_PLACEHOLDERS] },
  {
    key: "duplicate_person_email",
    label: "担当者メールアドレス重複",
    placeholders: ["{{new_name}}", "{{existing_name}}", "{{email}}", ...COMMON_PLACEHOLDERS],
  },
];

export type NotificationSettingRow = {
  eventType: NotificationEventType;
  slackChannelId: string;
  messageTemplate: string;
  isActive: boolean;
};
