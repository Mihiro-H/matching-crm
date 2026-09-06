import "server-only";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { FormFieldOption, FormFieldRow } from "./types";

export type PublicFormDetail = { id: string; name: string; fields: FormFieldRow[] };

/**
 * 公開問い合わせフォーム(/contact/[number])向けのフォーム構成取得。
 * URLには短い連番(form_definitions.number、resolve-form-id.tsの管理画面版と同じ理由)を使う。
 * 未ログインの訪問者からのアクセスを想定するため、RLS(authenticated限定)を経由する
 * 通常のサーバークライアントではなく、GET /api/forms/[id]/schema と同じ方針で
 * adminクライアントを使う。
 */
export async function getPublicFormById(numberParam: string): Promise<PublicFormDetail | null> {
  const number = Number(numberParam);
  if (!Number.isInteger(number)) return null;

  const admin = createSupabaseAdminClient();

  const { data: form, error: formError } = await admin
    .from("form_definitions")
    .select("id, name")
    .eq("number", number)
    .maybeSingle();

  if (formError || !form) return null;

  const { data: fieldRows, error: fieldsError } = await admin
    .from("form_fields")
    .select("id, field_key, is_builtin, label, answer_type, options, is_required, sort_order")
    .eq("form_id", form.id)
    .order("sort_order", { ascending: true });

  if (fieldsError) return null;

  const fields: FormFieldRow[] = (fieldRows ?? []).map((row) => ({
    id: row.id,
    fieldKey: row.field_key,
    isBuiltin: row.is_builtin,
    label: row.label,
    answerType: row.answer_type,
    options: Array.isArray(row.options) ? (row.options as FormFieldOption[]) : null,
    isRequired: row.is_required,
    sortOrder: row.sort_order,
  }));

  return { id: form.id, name: form.name, fields };
}
