import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { DealSource, DealStatus, Json, JobCategory } from "@/lib/supabase/database.types";

export type DealDetail = {
  id: string;
  number: number;
  personId: string;
  personName: string;
  personEmail: string | null;
  personPhone: string | null;
  companyId: string | null;
  companyName: string | null;
  status: DealStatus;
  source: DealSource;
  jobCategories: JobCategory[];
  inquiryBody: string | null;
  lostReason: string | null;
  wonReason: string | null;
  assigneeName: string | null;
  createdAt: string;
  updatedAt: string;
};

export async function getDealById(id: string): Promise<DealDetail | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("deals")
    .select(
      "id, number, status, source, job_categories, inquiry_body, lost_reason, won_reason, created_at, updated_at, person:people(id, name, email, phone, company_id, company_name_raw, company:companies(name)), assignee:users(name)"
    )
    .eq("id", id)
    .maybeSingle();

  if (error || !data || !data.person) return null;

  return {
    id: data.id,
    number: data.number,
    personId: data.person.id,
    personName: data.person.name,
    personEmail: data.person.email,
    personPhone: data.person.phone,
    companyId: data.person.company_id,
    companyName: data.person.company?.name ?? data.person.company_name_raw,
    status: data.status,
    source: data.source,
    jobCategories: data.job_categories,
    inquiryBody: data.inquiry_body,
    lostReason: data.lost_reason,
    wonReason: data.won_reason,
    assigneeName: data.assignee?.name ?? null,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

export type DealFormAnswer = { label: string; value: Json };

/**
 * 商談詳細「フォームの回答内容」(SCREEN_SPEC.md「商談管理」)。
 * 基本情報(氏名/メール/依頼職種/問い合わせ内容等)は他の項目で既に表示しているため、
 * ここではフォームの新規追加項目(カスタム項目、custom_fields参照)の回答のみを、
 * その問い合わせが実際に使われたフォームの項目名・並び順に合わせて表示する。
 * 手動作成等でform_idが無い商談は空配列を返す。
 */
export async function getDealFormAnswers(dealId: string): Promise<DealFormAnswer[]> {
  const supabase = await createSupabaseServerClient();
  const { data: deal, error: dealError } = await supabase
    .from("deals")
    .select("form_id, custom_fields")
    .eq("id", dealId)
    .maybeSingle();

  if (dealError || !deal || !deal.form_id) return [];

  const { data: fields, error: fieldsError } = await supabase
    .from("form_fields")
    .select("field_key, label, options, sort_order")
    .eq("form_id", deal.form_id)
    .eq("is_builtin", false)
    .order("sort_order", { ascending: true });

  if (fieldsError) return [];

  const customFields = (deal.custom_fields as Record<string, Json>) ?? {};

  return (fields ?? []).map((field) => {
    const rawValue = customFields[field.field_key] ?? null;
    return { label: field.label, value: resolveOptionLabels(rawValue, field.options) };
  });
}

function resolveOptionLabels(value: Json, options: unknown): Json {
  if (!Array.isArray(options) || value === null) return value;
  const labelByValue = new Map(
    (options as { value: string; label: string }[]).map((o) => [o.value, o.label])
  );
  if (Array.isArray(value)) {
    return value.map((v) => labelByValue.get(String(v)) ?? String(v));
  }
  return labelByValue.get(String(value)) ?? value;
}
