import { JOB_CATEGORIES } from "@/lib/job-categories";
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

const VALID_CATEGORIES = new Set<string>(JOB_CATEGORIES);

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
    const invalid = parts.find((c) => !VALID_CATEGORIES.has(c));
    if (invalid) {
      return { ok: false, error: `job_categoriesに不正な値があります: ${invalid}` };
    }
    jobCategories = parts as JobCategory[];
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
