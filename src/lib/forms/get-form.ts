import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { FormFieldOption, FormFieldRow } from "./types";

export type FormDetail = { id: string; name: string; fields: FormFieldRow[] };

function toFieldRow(row: {
  id: string;
  field_key: string;
  is_builtin: boolean;
  label: string;
  answer_type: FormFieldRow["answerType"];
  options: unknown;
  is_required: boolean;
  sort_order: number;
}): FormFieldRow {
  return {
    id: row.id,
    fieldKey: row.field_key,
    isBuiltin: row.is_builtin,
    label: row.label,
    answerType: row.answer_type,
    options: Array.isArray(row.options) ? (row.options as FormFieldOption[]) : null,
    isRequired: row.is_required,
    sortOrder: row.sort_order,
  };
}

/** フォーム編集画面(フォーム管理)。 */
export async function getFormById(formId: string): Promise<FormDetail | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("form_definitions")
    .select("id, name, form_fields(*)")
    .eq("id", formId)
    .maybeSingle();

  if (error || !data) return null;

  const fields = (data.form_fields ?? []).map(toFieldRow).sort((a, b) => a.sortOrder - b.sortOrder);
  return { id: data.id, name: data.name, fields };
}
