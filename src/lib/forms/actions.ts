"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { BUILTIN_FIELDS, getBuiltinFieldDef, type BuiltinFieldKey } from "./builtin-fields";
import type { FormAnswerType } from "@/lib/supabase/database.types";

export type MutationResult = { success: true } | { success: false; error: string };
export type CreateFormResult = { success: true; id: string } | { success: false; error: string };

/**
 * フォーム新規作成(フォーム管理、SCREEN_SPEC.md)。
 * 現行の問い合わせ受付Webhookが前提としていた6項目(氏名/メール/電話/企業名/
 * 依頼職種/問い合わせ内容)を初期状態としてそのまま登録しておく
 * (氏名のみ必須、他は任意。既存の運用と同じ初期状態から編集を始められるようにするため)。
 */
export async function createForm(name: string): Promise<CreateFormResult> {
  const authCheck = await requireAdmin();
  if (!authCheck.ok) return { success: false, error: authCheck.error };

  if (!name.trim()) {
    return { success: false, error: "フォーム名を入力してください。" };
  }

  const supabase = await createSupabaseServerClient();
  const { data: form, error } = await supabase
    .from("form_definitions")
    .insert({ name: name.trim() })
    .select("id")
    .single();

  if (error) return { success: false, error: error.message };

  const { error: fieldsError } = await supabase.from("form_fields").insert(
    BUILTIN_FIELDS.map((field, index) => ({
      form_id: form.id,
      field_key: field.key,
      is_builtin: true,
      label: field.defaultLabel,
      answer_type: field.answerType,
      options: field.options,
      is_required: field.key === "name",
      sort_order: index,
    }))
  );

  if (fieldsError) return { success: false, error: fieldsError.message };

  revalidatePath("/forms");
  return { success: true, id: form.id };
}

export async function renameForm(formId: string, name: string): Promise<MutationResult> {
  const authCheck = await requireAdmin();
  if (!authCheck.ok) return { success: false, error: authCheck.error };

  if (!name.trim()) {
    return { success: false, error: "フォーム名を入力してください。" };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("form_definitions").update({ name: name.trim() }).eq("id", formId);
  if (error) return { success: false, error: error.message };

  revalidatePath(`/forms/${formId}`);
  revalidatePath("/forms");
  return { success: true };
}

export async function deleteForm(formId: string): Promise<MutationResult> {
  const authCheck = await requireAdmin();
  if (!authCheck.ok) return { success: false, error: authCheck.error };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("form_definitions").delete().eq("id", formId);
  if (error) return { success: false, error: error.message };

  revalidatePath("/forms");
  return { success: true };
}

async function nextSortOrder(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  formId: string
): Promise<number> {
  const { data } = await supabase
    .from("form_fields")
    .select("sort_order")
    .eq("form_id", formId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data?.sort_order ?? -1) + 1;
}

/** 既存のCRM項目(ビルトイン)をフォームに追加する。 */
export async function addBuiltinField(formId: string, key: BuiltinFieldKey): Promise<MutationResult> {
  const authCheck = await requireAdmin();
  if (!authCheck.ok) return { success: false, error: authCheck.error };

  const def = getBuiltinFieldDef(key);
  if (!def) return { success: false, error: "不正な項目です。" };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("form_fields").insert({
    form_id: formId,
    field_key: def.key,
    is_builtin: true,
    label: def.defaultLabel,
    answer_type: def.answerType,
    options: def.options,
    is_required: false,
    sort_order: await nextSortOrder(supabase, formId),
  });

  if (error) return { success: false, error: error.message };

  revalidatePath(`/forms/${formId}`);
  return { success: true };
}

/**
 * 新規項目(CRMにまだ無い項目)をフォームに追加する。
 * 回答はcontacts.custom_fields(jsonb)にfield_keyをキーとして保存するため
 * (DBの実カラムを都度追加するのは実行時スキーマ変更のリスクが大きいため避ける)、
 * field_keyはラベルに依存しないランダムな識別子にする。
 */
export async function addCustomField(
  formId: string,
  input: { label: string; answerType: FormAnswerType; options: string[]; isRequired: boolean }
): Promise<MutationResult> {
  const authCheck = await requireAdmin();
  if (!authCheck.ok) return { success: false, error: authCheck.error };

  if (!input.label.trim()) {
    return { success: false, error: "項目名を入力してください。" };
  }
  const needsOptions = input.answerType === "single_select" || input.answerType === "multi_select";
  const options = input.options.map((o) => o.trim()).filter(Boolean);
  if (needsOptions && options.length === 0) {
    return { success: false, error: "選択肢を1つ以上入力してください。" };
  }

  const supabase = await createSupabaseServerClient();
  const fieldKey = `custom_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;
  const { error } = await supabase.from("form_fields").insert({
    form_id: formId,
    field_key: fieldKey,
    is_builtin: false,
    label: input.label.trim(),
    answer_type: input.answerType,
    options: needsOptions ? options.map((label) => ({ value: label, label })) : null,
    is_required: input.isRequired,
    sort_order: await nextSortOrder(supabase, formId),
  });

  if (error) return { success: false, error: error.message };

  revalidatePath(`/forms/${formId}`);
  return { success: true };
}

/** 項目の編集(ラベル・必須・選択肢)。回答方式・対応するCRM項目自体は変更不可。 */
export async function updateField(
  fieldId: string,
  input: { label: string; isRequired: boolean; options: string[] | null }
): Promise<MutationResult> {
  const authCheck = await requireAdmin();
  if (!authCheck.ok) return { success: false, error: authCheck.error };

  if (!input.label.trim()) {
    return { success: false, error: "項目名を入力してください。" };
  }

  const supabase = await createSupabaseServerClient();
  const options = input.options?.map((o) => o.trim()).filter(Boolean) ?? null;
  const { data: field, error } = await supabase
    .from("form_fields")
    .update({
      label: input.label.trim(),
      is_required: input.isRequired,
      options: options && options.length > 0 ? options.map((label) => ({ value: label, label })) : null,
    })
    .eq("id", fieldId)
    .select("form_id")
    .single();

  if (error) return { success: false, error: error.message };

  revalidatePath(`/forms/${field.form_id}`);
  return { success: true };
}

/** 項目の削除。氏名(name)はフォームから外せない(問い合わせ受付の必須項目のため)。 */
export async function removeField(fieldId: string): Promise<MutationResult> {
  const authCheck = await requireAdmin();
  if (!authCheck.ok) return { success: false, error: authCheck.error };

  const supabase = await createSupabaseServerClient();
  const { data: field, error: fetchError } = await supabase
    .from("form_fields")
    .select("form_id, field_key, is_builtin")
    .eq("id", fieldId)
    .maybeSingle();

  if (fetchError) return { success: false, error: fetchError.message };
  if (!field) return { success: false, error: "項目が見つかりません。" };
  if (field.is_builtin && field.field_key === "name") {
    return { success: false, error: "「氏名」はフォームから外せません。" };
  }

  const { error } = await supabase.from("form_fields").delete().eq("id", fieldId);
  if (error) return { success: false, error: error.message };

  revalidatePath(`/forms/${field.form_id}`);
  return { success: true };
}

/** 項目の並べ替え(隣接する項目とsort_orderを入れ替える)。 */
export async function moveField(
  formId: string,
  fieldId: string,
  direction: "up" | "down"
): Promise<MutationResult> {
  const authCheck = await requireAdmin();
  if (!authCheck.ok) return { success: false, error: authCheck.error };

  const supabase = await createSupabaseServerClient();
  const { data: fields, error } = await supabase
    .from("form_fields")
    .select("id, sort_order")
    .eq("form_id", formId)
    .order("sort_order", { ascending: true });

  if (error) return { success: false, error: error.message };

  const list = fields ?? [];
  const index = list.findIndex((f) => f.id === fieldId);
  const targetIndex = direction === "up" ? index - 1 : index + 1;
  if (index < 0 || targetIndex < 0 || targetIndex >= list.length) {
    return { success: true };
  }

  const current = list[index];
  const target = list[targetIndex];

  const { error: updateError } = await supabase
    .from("form_fields")
    .update({ sort_order: target.sort_order })
    .eq("id", current.id);
  if (updateError) return { success: false, error: updateError.message };

  const { error: updateError2 } = await supabase
    .from("form_fields")
    .update({ sort_order: current.sort_order })
    .eq("id", target.id);
  if (updateError2) return { success: false, error: updateError2.message };

  revalidatePath(`/forms/${formId}`);
  return { success: true };
}
