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

export type MergeCandidatePerson = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  companyId: string | null;
  companyName: string | null;
  dealCount: number;
};

/**
 * 統合対象候補(重複していたもう一方の担当者)の現在値を取得する
 * (統合モーダルで項目ごとにどちらの値を残すか選ぶための比較表示に使う)。
 */
export async function getPersonForMerge(personId: string): Promise<MergeCandidatePerson | null> {
  const authCheck = await requireEditAccess("people");
  if (!authCheck.ok) return null;

  const supabase = await createSupabaseServerClient();
  const [{ data, error }, { count }] = await Promise.all([
    supabase
      .from("people")
      .select("id, name, email, phone, company_id, company_name_raw, company:companies(name)")
      .eq("id", personId)
      .maybeSingle(),
    supabase.from("deals").select("id", { count: "exact", head: true }).eq("person_id", personId),
  ]);

  if (error || !data) return null;

  return {
    id: data.id,
    name: data.name,
    email: data.email,
    phone: data.phone,
    companyId: data.company_id,
    companyName: data.company?.name ?? data.company_name_raw,
    dealCount: count ?? 0,
  };
}

type MergeFieldChoice = "keep" | "other";

export type MergePeopleInput = {
  keepId: string;
  otherId: string;
  name: MergeFieldChoice;
  email: MergeFieldChoice;
  phone: MergeFieldChoice;
  company: MergeFieldChoice;
};

/**
 * 重複担当者の統合(SCREEN_SPEC.md「担当者一覧」)。keepId側を正として残し、
 * 項目ごとに指定された側(keep/other)の値を採用したうえで、otherId側に紐づく商談
 * (deals.person_id)をすべてkeepId側へ付け替えてから、otherIdを削除する。
 * deals.person_idはon delete restrictのため、先に付け替えないとotherIdの削除は
 * 失敗する(=途中で失敗しても商談が宙に浮いたり消えたりしない安全な順序になっている)。
 * 企業(company_id/company_name_raw)はどちらの企業に統一するかという1つの選択のため、
 * 2列をまとめて1項目として扱う。
 */
export async function mergePeople(input: MergePeopleInput): Promise<MutationResult> {
  const authCheck = await requireEditAccess("people");
  if (!authCheck.ok) return { success: false, error: authCheck.error };

  if (input.keepId === input.otherId) {
    return { success: false, error: "同じ担当者は統合できません。" };
  }

  const supabase = await createSupabaseServerClient();

  const [{ data: keep, error: keepError }, { data: other, error: otherError }] = await Promise.all([
    supabase.from("people").select("*").eq("id", input.keepId).maybeSingle(),
    supabase.from("people").select("*").eq("id", input.otherId).maybeSingle(),
  ]);

  if (keepError || otherError) {
    return { success: false, error: (keepError ?? otherError)!.message };
  }
  if (!keep || !other) {
    return { success: false, error: "担当者データが見つかりません。" };
  }

  const { error: updateError } = await supabase
    .from("people")
    .update({
      name: input.name === "other" ? other.name : keep.name,
      email: input.email === "other" ? other.email : keep.email,
      phone: input.phone === "other" ? other.phone : keep.phone,
      company_id: input.company === "other" ? other.company_id : keep.company_id,
      company_name_raw: input.company === "other" ? other.company_name_raw : keep.company_name_raw,
    })
    .eq("id", input.keepId);
  if (updateError) return { success: false, error: updateError.message };

  const { error: reassignError } = await supabase
    .from("deals")
    .update({ person_id: input.keepId })
    .eq("person_id", input.otherId);
  if (reassignError) return { success: false, error: reassignError.message };

  const { error: deleteError } = await supabase.from("people").delete().eq("id", input.otherId);
  if (deleteError) return { success: false, error: deleteError.message };

  revalidatePath(`/people/${input.keepId}`);
  revalidatePath("/people");
  return { success: true };
}
