import type { ContractStatus, DealStatus, PaymentStatus, ProjectStatus } from "./supabase/database.types";

/**
 * DESIGN_TOKENS.md「セマンティックカラー」の4分類。
 * 新しいステータス系バッジを追加するときも、この4分類のどれに近いかを
 * マッピングしてから色を割り当てる(担当者の好みで色を変えない)。
 */
export type SemanticStatus = "info" | "success" | "warning" | "danger";

export const SEMANTIC_STATUS_CLASSES: Record<SemanticStatus, { bg: string; text: string }> = {
  info: { bg: "bg-info-bg", text: "text-info-text" },
  success: { bg: "bg-success-bg", text: "text-success-text" },
  warning: { bg: "bg-warning-bg", text: "text-warning-text" },
  danger: { bg: "bg-danger-bg", text: "text-danger-text" },
};

export type StatusMeta = { label: string; semantic: SemanticStatus };

/** DB_SCHEMA.md: deals.status(商談管理画面のパイプライン) */
export const DEAL_STATUS_META: Record<DealStatus, StatusMeta> = {
  new: { label: "未対応", semantic: "info" },
  in_progress: { label: "対応中", semantic: "info" },
  negotiating: { label: "商談中", semantic: "info" },
  on_hold: { label: "保留", semantic: "warning" },
  won: { label: "受注", semantic: "success" },
  lost: { label: "失注", semantic: "danger" },
};

/** DB_SCHEMA.md: projects.status。案件は商談が受注した時点で初めて作られるため「受注」から始まる。 */
export const PROJECT_STATUS_META: Record<ProjectStatus, StatusMeta> = {
  won: { label: "受注", semantic: "success" },
  contract_sent: { label: "電子契約送付", semantic: "warning" },
  contracted: { label: "契約済", semantic: "success" },
  in_progress: { label: "進行中", semantic: "success" },
  inspected: { label: "検収済", semantic: "success" },
  payment_pending: { label: "支払待ち", semantic: "warning" },
  completed: { label: "完了", semantic: "success" },
};

/** DB_SCHEMA.md: estimates.contract_status */
export const CONTRACT_STATUS_META: Record<ContractStatus, StatusMeta> = {
  draft: { label: "下書き", semantic: "info" },
  sent: { label: "送付済", semantic: "warning" },
  signed: { label: "締結済", semantic: "success" },
  rejected: { label: "却下", semantic: "danger" },
};

/** DB_SCHEMA.md: invoices.payment_status */
export const PAYMENT_STATUS_META: Record<PaymentStatus, StatusMeta> = {
  not_invoiced: { label: "未請求", semantic: "info" },
  invoiced: { label: "請求済", semantic: "warning" },
  unpaid: { label: "未回収", semantic: "danger" },
  paid: { label: "入金済", semantic: "success" },
};
