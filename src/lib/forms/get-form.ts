import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { FormFieldOption, FormFieldRow } from "./types";

export type FormDetail = {
  id: string;
  number: number;
  name: string;
  fields: FormFieldRow[];
  autoReplyEnabled: boolean;
  autoReplySubject: string;
  autoReplyBody: string;
};

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
    .select("id, number, name, auto_reply_enabled, auto_reply_subject, auto_reply_body, form_fields(*)")
    .eq("id", formId)
    .maybeSingle();

  if (error || !data) return null;

  const fields = (data.form_fields ?? []).map(toFieldRow).sort((a, b) => a.sortOrder - b.sortOrder);
  return {
    id: data.id,
    number: data.number,
    name: data.name,
    fields,
    autoReplyEnabled: data.auto_reply_enabled,
    autoReplySubject: data.auto_reply_subject ?? "",
    autoReplyBody: data.auto_reply_body ?? "",
  };
}
