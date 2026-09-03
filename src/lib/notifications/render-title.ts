import { renderMessageTemplate } from "@/lib/slack/template";
import type { NotificationEventType } from "@/lib/supabase/database.types";

const NOTIFICATION_TITLE_TEMPLATES: Record<NotificationEventType, string> = {
  new_lead: "新規問い合わせ: {{company_name}}",
  contract_signed: "契約締結: {{company_name}} / {{project_title}}",
  // {{amount}}はformatCurrencyJPY()済み(¥記号込み)の文字列を想定(呼び出し側参照)
  payment_confirmed: "入金確認: {{company_name}} / {{project_title}} ({{amount}})",
  reminder: "リマインド: {{company_name}} / {{project_title}}",
};

/** アプリ内通知(ベル)一覧に表示するタイトルを組み立てる。Slack通知と同じplaceholdersを使い回す。 */
export function renderNotificationTitle(
  eventType: NotificationEventType,
  placeholders: Record<string, string>
): string {
  return renderMessageTemplate(NOTIFICATION_TITLE_TEMPLATES[eventType], placeholders);
}
