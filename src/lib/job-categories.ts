import type { JobCategory } from "./supabase/database.types";

/** DB_SCHEMA.md: job_categories(writer/photographer/marketer/designer)の表示ラベル */
export const JOB_CATEGORY_LABELS: Record<JobCategory, string> = {
  writer: "ライター",
  photographer: "フォトグラファー",
  marketer: "マーケター",
  designer: "デザイナー",
};

export const JOB_CATEGORIES: JobCategory[] = ["writer", "photographer", "marketer", "designer"];

/** カンバンカードの職種枠概要(SCREEN_SPEC.md 4章 例:「ライター1・デザイナー1」) */
export function formatRoleSummary(roles: { job_category: JobCategory; headcount: number }[]): string {
  return roles.map((role) => `${JOB_CATEGORY_LABELS[role.job_category]}${role.headcount}`).join("・");
}
