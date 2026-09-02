import { JOB_CATEGORIES } from "@/lib/job-categories";
import type { JobCategory } from "@/lib/supabase/database.types";

export type FormLeadData = {
  name: string;
  email: string | null;
  phone: string | null;
  companyNameRaw: string | null;
  jobCategories: JobCategory[];
  inquiryBody: string | null;
};

export type ParseFormLeadResult = { ok: true; data: FormLeadData } | { ok: false; error: string };

const VALID_CATEGORIES = new Set<string>(JOB_CATEGORIES);

/**
 * 外部フォームからのリード受付Webhook(DB_SCHEMA.md contacts「運用ルール」)のペイロードを
 * 検証・パースする。実際のフォーム側の正確なフィールド名は未確定のため、
 * DB_SCHEMA.mdのcontactsカラム名に準拠したJSON形状を仮定している
 * (name/email/phone/company_name/job_categories/inquiry_body)。
 * 実際の連携時にフォーム側の実データ形式に合わせて調整すること。
 */
export function parseFormLeadPayload(body: unknown): ParseFormLeadResult {
  if (typeof body !== "object" || body === null) {
    return { ok: false, error: "不正なリクエストです" };
  }

  const record = body as Record<string, unknown>;

  const name = typeof record.name === "string" ? record.name.trim() : "";
  if (!name) {
    return { ok: false, error: "nameが空です" };
  }

  const jobCategoriesRaw = Array.isArray(record.job_categories) ? record.job_categories : [];
  const invalid = jobCategoriesRaw.find((c) => !VALID_CATEGORIES.has(String(c)));
  if (invalid !== undefined) {
    return { ok: false, error: `job_categoriesに不正な値があります: ${invalid}` };
  }

  return {
    ok: true,
    data: {
      name,
      email: typeof record.email === "string" ? record.email : null,
      phone: typeof record.phone === "string" ? record.phone : null,
      companyNameRaw: typeof record.company_name === "string" ? record.company_name : null,
      jobCategories: jobCategoriesRaw as JobCategory[],
      inquiryBody: typeof record.inquiry_body === "string" ? record.inquiry_body : null,
    },
  };
}
