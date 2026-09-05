"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireEditAccess } from "@/lib/auth/require-edit";
import { parseActionItems, toggleActionItem, type ActionItem } from "./action-items";
import { buildFlatSummaryExcerpt } from "./summary-excerpt";
import type { SummarySections } from "./summary-sections";

export type MutationResult = { success: true; actionItems: ActionItem[] } | { success: false; error: string };
export type SimpleMutationResult = { success: true } | { success: false; error: string };

/**
 * アクションアイテムの完了/未完了をトグルする(SCREEN_SPEC.md 6章)。
 * view権限のユーザーはこの操作を行えない(SCREEN_SPEC.md「権限: viewはタスクのトグル操作を不可」)。
 */
export async function toggleMeetingNoteActionItem(
  meetingNoteId: string,
  index: number
): Promise<MutationResult> {
  const authCheck = await requireEditAccess("meeting_notes");
  if (!authCheck.ok) return { success: false, error: authCheck.error };

  const supabase = await createSupabaseServerClient();

  const { data: current, error: fetchError } = await supabase
    .from("meeting_notes")
    .select("action_items")
    .eq("id", meetingNoteId)
    .single();

  if (fetchError) return { success: false, error: fetchError.message };

  const updated = toggleActionItem(parseActionItems(current.action_items), index);

  const { error: updateError } = await supabase
    .from("meeting_notes")
    .update({ action_items: updated })
    .eq("id", meetingNoteId);

  if (updateError) return { success: false, error: updateError.message };

  revalidatePath(`/meeting-notes/${meetingNoteId}`);
  return { success: true, actionItems: updated };
}

/**
 * 議事録の基本項目(タイトル・会議日時・AI要約の3分類)を手動編集する
 * (SCREEN_SPEC.md 6章「議事録の編集・削除」)。AIの要約が実態と違う場合の手直し用。
 * ai_summary(一覧カードの抜粋表示用の平文)も編集後の内容から作り直す。
 * 文字起こし全文(transcript_text)は事実の記録のため編集対象にしない。
 */
export async function updateMeetingNote(
  meetingNoteId: string,
  input: { title: string; meetingAt: string; sections: SummarySections }
): Promise<SimpleMutationResult> {
  const authCheck = await requireEditAccess("meeting_notes");
  if (!authCheck.ok) return { success: false, error: authCheck.error };

  const title = input.title.trim();
  if (!title) return { success: false, error: "タイトルを入力してください。" };
  if (!input.meetingAt) return { success: false, error: "会議日時を入力してください。" };

  const supabase = await createSupabaseServerClient();

  const { data: current, error: fetchError } = await supabase
    .from("meeting_notes")
    .select("transcript_text")
    .eq("id", meetingNoteId)
    .maybeSingle();
  if (fetchError) return { success: false, error: fetchError.message };
  if (!current) return { success: false, error: "議事録が見つかりません。" };

  const { error } = await supabase
    .from("meeting_notes")
    .update({
      title,
      meeting_at: input.meetingAt,
      ai_summary_sections: input.sections,
      ai_summary: buildFlatSummaryExcerpt(input.sections, current.transcript_text ?? ""),
    })
    .eq("id", meetingNoteId);

  if (error) return { success: false, error: error.message };

  revalidatePath(`/meeting-notes/${meetingNoteId}`);
  revalidatePath("/meeting-notes");
  return { success: true };
}

/** 議事録の削除(SCREEN_SPEC.md 6章「議事録の編集・削除」)。取り消せないため呼び出し側で確認を挟むこと。 */
export async function deleteMeetingNote(meetingNoteId: string): Promise<SimpleMutationResult> {
  const authCheck = await requireEditAccess("meeting_notes");
  if (!authCheck.ok) return { success: false, error: authCheck.error };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("meeting_notes").delete().eq("id", meetingNoteId);
  if (error) return { success: false, error: error.message };

  revalidatePath("/meeting-notes");
  return { success: true };
}
