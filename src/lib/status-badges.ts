import type {
  CompanyStatus,
  ContactStatus,
  ContractStatus,
  PaymentStatus,
  ProjectStatus,
} from "./supabase/database.types";

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

/** DB_SCHEMA.md: companies.status に対応する表示ラベルと4分類のマッピング */
export const COMPANY_STATUS_META: Record<CompanyStatus, StatusMeta> = {
  negotiating: { label: "商談中", semantic: "info" },
  active: { label: "進行中", semantic: "success" },
  paused: { label: "一時休止", semantic: "warning" },
  cold: { label: "コールド", semantic: "danger" },
};

/** DB_SCHEMA.md: contacts.status(商談・担当者管理画面のパイプライン) */
export const CONTACT_STATUS_META: Record<ContactStatus, StatusMeta> = {
  new: { label: "未対応", semantic: "info" },
  in_progress: { label: "対応中", semantic: "info" },
  negotiating: { label: "商談中", semantic: "info" },
  won: { label: "受注", semantic: "success" },
  lost: { label: "失注", semantic: "danger" },
};

/** DB_SCHEMA.md: projects.status (8段階) */
export const PROJECT_STATUS_META: Record<ProjectStatus, StatusMeta> = {
  negotiating: { label: "商談中", semantic: "info" },
  estimate_submitted: { label: "見積提出済", semantic: "info" },
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
