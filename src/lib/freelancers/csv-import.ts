import { JOB_CATEGORIES, JOB_CATEGORY_LABELS } from "@/lib/job-categories";
import type { JobCategory } from "@/lib/supabase/database.types";

export type FreelancerCsvRowData = {
  platform_freelancer_id: string;
  name: string;
  email: string | null;
  job_categories: JobCategory[] | null;
};

export type ParseFreelancerCsvRowResult =
  | { ok: true; data: FreelancerCsvRowData }
  | { ok: false; error: string };

/**
 * job_categoriesの値として受け付けるキー。DB上のキー(writer等)に加え、
 * 提携先プラットフォームからのCSVエクスポートは日本語ラベルで来ることがあるため、
 * このアプリ自身の表示ラベル(JOB_CATEGORY_LABELS)と、それとは別の一般的な同義語
 * (フォトグラファー職を指す「カメラマン」等)も受け付ける。
 */
const CATEGORY_ALIASES: Record<string, JobCategory> = {
  ...Object.fromEntries(JOB_CATEGORIES.map((c) => [c, c])),
  ...Object.fromEntries(JOB_CATEGORIES.map((c) => [JOB_CATEGORY_LABELS[c], c])),
  カメラマン: "photographer",
};

/**
 * フリーランスCSVインポート(SCREEN_SPEC.md 9章 / DB_SCHEMA.md csv_imports)の1行を
 * 検証・パースする。platform_freelancer_id/nameは必須、job_categoriesはカンマ区切り。
 */
export function parseFreelancerCsvRow(row: Record<string, string | undefined>): ParseFreelancerCsvRowResult {
  const platformFreelancerId = row.platform_freelancer_id?.trim();
  if (!platformFreelancerId) {
    return { ok: false, error: "platform_freelancer_idが空です" };
  }

  const name = row.name?.trim();
  if (!name) {
    return { ok: false, error: "nameが空です" };
  }

  const email = row.email?.trim() || null;

  const rawCategories = row.job_categories?.trim();
  let jobCategories: JobCategory[] | null = null;
  if (rawCategories) {
    const parts = rawCategories.split(",").map((c) => c.trim());
    const invalid = parts.find((c) => !(c in CATEGORY_ALIASES));
    if (invalid) {
      return { ok: false, error: `job_categoriesに不正な値があります: ${invalid}` };
    }
    jobCategories = parts.map((c) => CATEGORY_ALIASES[c]);
  }

  return {
    ok: true,
    data: {
      platform_freelancer_id: platformFreelancerId,
      name,
      email,
      job_categories: jobCategories,
    },
  };
}
