"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireEditAccess } from "@/lib/auth/require-edit";

export type MutationResult = { success: true } | { success: false; error: string };
export type CreatePersonResult = { success: true; id: string } | { success: false; error: string };

/** 担当者一覧「+新規作成」、および商談作成画面での担当者インライン新規登録。 */
export async function createPerson(input: {
  companyId: string | null;
  companyNameRaw: string | null;
  name: string;
  email: string | null;
  phone: string | null;
}): Promise<CreatePersonResult> {
  const authCheck = await requireEditAccess("people");
  if (!authCheck.ok) return { success: false, error: authCheck.error };

  if (!input.name.trim()) {
    return { success: false, error: "担当者名を入力してください。" };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("people")
    .insert({
      company_id: input.companyId,
      company_name_raw: input.companyId ? null : input.companyNameRaw?.trim() || null,
      name: input.name.trim(),
      email: input.email?.trim() || null,
      phone: input.phone?.trim() || null,
    })
    .select("id")
    .single();

  if (error) return { success: false, error: error.message };

  revalidatePath("/people");
  return { success: true, id: data.id };
}

/** 担当者詳細の基本項目編集(氏名/メール/電話番号)。企業の紐付け変更もここで行う。 */
export async function updatePerson(
  personId: string,
  input: { name: string; email: string | null; phone: string | null; companyId: string | null }
): Promise<MutationResult> {
  const authCheck = await requireEditAccess("people");
  if (!authCheck.ok) return { success: false, error: authCheck.error };

  if (!input.name.trim()) {
    return { success: false, error: "担当者名を入力してください。" };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("people")
    .update({
      name: input.name.trim(),
      email: input.email?.trim() || null,
      phone: input.phone?.trim() || null,
      company_id: input.companyId,
    })
    .eq("id", personId);

  if (error) return { success: false, error: error.message };

  revalidatePath(`/people/${personId}`);
  revalidatePath("/people");
  return { success: true };
}
