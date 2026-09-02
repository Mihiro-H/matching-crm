"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ContactStatus } from "@/lib/supabase/database.types";
import { getNextStatusOptions } from "./status";

export type MutationResult = { success: true } | { success: false; error: string };

/**
 * new→in_progress、in_progress→negotiating など、
 * 単純なステータス進行(SCREEN_SPEC.md 2章)。won/lostは専用アクションを使う。
 *
 * TODO(permissions): view権限のユーザーはこの操作を行えない
 * (SCREEN_SPEC.md「権限: viewはステータス変更...を不可」)。認証実装後に追加する。
 */
export async function advanceContactStatus(
  contactId: string,
  currentStatus: ContactStatus,
  newStatus: "in_progress" | "negotiating"
): Promise<MutationResult> {
  if (!(getNextStatusOptions(currentStatus) as ContactStatus[]).includes(newStatus)) {
    return { success: false, error: "その状態には変更できません。" };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("contacts").update({ status: newStatus }).eq("id", contactId);

  if (error) return { success: false, error: error.message };

  revalidatePath(`/contacts/${contactId}`);
  revalidatePath("/contacts");
  return { success: true };
}

/** 失注にする。lost_reasonの入力を必須にする(SCREEN_SPEC.md 2章) */
export async function markContactLost(contactId: string, lostReason: string): Promise<MutationResult> {
  if (!lostReason.trim()) {
    return { success: false, error: "失注理由を入力してください。" };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("contacts")
    .update({ status: "lost", lost_reason: lostReason.trim() })
    .eq("id", contactId);

  if (error) return { success: false, error: error.message };

  revalidatePath(`/contacts/${contactId}`);
  revalidatePath("/contacts");
  return { success: true };
}

/**
 * 受注確定(SCREEN_SPEC.md 2章)。企業選択モーダルで確定/新規登録された companyId を
 * セットし、status='won'・is_current=true・started_atを当日日付にする。
 */
export async function markContactWon(contactId: string, companyId: string): Promise<MutationResult> {
  const supabase = await createSupabaseServerClient();
  const today = new Date().toISOString().slice(0, 10);
  const { error } = await supabase
    .from("contacts")
    .update({ status: "won", company_id: companyId, is_current: true, started_at: today })
    .eq("id", contactId);

  if (error) return { success: false, error: error.message };

  revalidatePath(`/contacts/${contactId}`);
  revalidatePath("/contacts");
  return { success: true };
}

/**
 * 担当者交代(SCREEN_SPEC.md 2章)。既存の窓口担当者行を is_current=false + ended_at で
 * 更新し、同じ企業に対する新しい窓口担当者行を別途INSERTする。
 *
 * 新規行の source は「担当者交代による社内的な作成」であり新規の問い合わせではないため
 * 'other' とする(DB_SCHEMA.mdに交代フローでのsource指定はなく、判断で補った)。
 */
export type ReplaceContactResult =
  | { success: true; newContactId: string }
  | { success: false; error: string };

export async function replaceContact(
  currentContactId: string,
  newContact: { name: string; email: string | null }
): Promise<ReplaceContactResult> {
  const supabase = await createSupabaseServerClient();

  const { data: current, error: fetchError } = await supabase
    .from("contacts")
    .select("company_id, assigned_user_id")
    .eq("id", currentContactId)
    .single();

  if (fetchError) return { success: false, error: fetchError.message };

  const today = new Date().toISOString().slice(0, 10);

  const { error: updateError } = await supabase
    .from("contacts")
    .update({ is_current: false, ended_at: today })
    .eq("id", currentContactId);

  if (updateError) return { success: false, error: updateError.message };

  const { data: inserted, error: insertError } = await supabase
    .from("contacts")
    .insert({
      company_id: current.company_id,
      name: newContact.name,
      email: newContact.email,
      source: "other",
      status: "won",
      is_current: true,
      assigned_user_id: current.assigned_user_id,
      started_at: today,
    })
    .select("id")
    .single();

  if (insertError) return { success: false, error: insertError.message };

  revalidatePath(`/contacts/${currentContactId}`);
  revalidatePath(`/contacts/${inserted.id}`);
  revalidatePath("/contacts");
  return { success: true, newContactId: inserted.id };
}
