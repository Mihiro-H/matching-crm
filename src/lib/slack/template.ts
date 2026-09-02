/**
 * notification_settings.message_template / report_schedules.message_template
 * (DB_SCHEMA.md)の{{placeholder}}を実データで置換する。
 * 未知のプレースホルダーはそのまま残す(意図しない空文字化を避ける)。
 */
export function renderMessageTemplate(template: string, values: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key: string) => {
    return Object.prototype.hasOwnProperty.call(values, key) ? values[key] : match;
  });
}
