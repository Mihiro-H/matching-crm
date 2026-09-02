/**
 * レポートに含められる項目(SCREEN_SPEC.md 8章 / DB_SCHEMA.md reports.metrics)。
 * この6項目から複数選択する仕様で確定済み。
 */
export const REPORT_METRIC_OPTIONS = [
  { key: "new_contacts_count", label: "新規問い合わせ数" },
  { key: "won_count_and_revenue", label: "受注数・受注額" },
  { key: "unpaid_invoice_total", label: "未回収請求額" },
  { key: "project_status_breakdown", label: "案件ステータス内訳" },
  { key: "assignee_performance", label: "担当者別成績" },
  { key: "company_revenue_ranking", label: "企業別売上ランキング" },
] as const;

export type ReportMetricKey = (typeof REPORT_METRIC_OPTIONS)[number]["key"];

export const REPORT_MESSAGE_TEMPLATE_PLACEHOLDERS = ["{{report_name}}", "{{period}}"];
