import type { JobCategory } from "./supabase/database.types";

/** DB_SCHEMA.md: job_categories(writer/photographer/marketer/designer)の表示ラベル */
export const JOB_CATEGORY_LABELS: Record<JobCategory, string> = {
  writer: "ライター",
  photographer: "フォトグラファー",
  marketer: "マーケター",
  designer: "デザイナー",
};

export const JOB_CATEGORIES: JobCategory[] = ["writer", "photographer", "marketer", "designer"];

/**
 * 職種タグの色分け(フリーランス一覧「対応職種」列など)。
 * デザイントークンにこの用途専用の色は無いため、既存のセマンティックカラー4色
 * (primary/accent/warning/danger)を意味に関係なく区別用途として流用する。
 */
export const JOB_CATEGORY_TAG_STYLES: Record<JobCategory, string> = {
  writer: "bg-primary-100 text-primary-600",
  photographer: "bg-accent-50 text-accent-600",
  marketer: "bg-warning-bg text-warning-text",
  designer: "bg-danger-bg text-danger-text",
};

/** カンバンカードの職種枠概要(SCREEN_SPEC.md 4章 例:「ライター1・デザイナー1」) */
export function formatRoleSummary(roles: { job_category: JobCategory; headcount: number }[]): string {
  return roles.map((role) => `${JOB_CATEGORY_LABELS[role.job_category]}${role.headcount}`).join("・");
}
