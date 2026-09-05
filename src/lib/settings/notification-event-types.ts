import type { NotificationEventType } from "@/lib/supabase/database.types";

export const NOTIFICATION_EVENT_TYPES: { key: NotificationEventType; label: string; placeholders: string[] }[] = [
  { key: "new_lead", label: "新規問い合わせ", placeholders: ["{{company_name}}"] },
  { key: "contract_signed", label: "契約締結", placeholders: ["{{company_name}}", "{{project_title}}"] },
  {
    key: "payment_confirmed",
    label: "入金確認",
    placeholders: ["{{company_name}}", "{{project_title}}", "{{amount}}"],
  },
  { key: "reminder", label: "リマインド", placeholders: ["{{company_name}}", "{{project_title}}"] },
  { key: "meeting_note_ready", label: "議事録作成完了", placeholders: ["{{title}}"] },
  { key: "meeting_note_failed", label: "議事録作成失敗", placeholders: ["{{title}}"] },
];

export type NotificationSettingRow = {
  eventType: NotificationEventType;
  slackChannelId: string;
  messageTemplate: string;
  isActive: boolean;
};
