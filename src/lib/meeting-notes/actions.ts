"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireEditAccess } from "@/lib/auth/require-edit";
import { parseActionItems, toggleActionItem, type ActionItem } from "./action-items";

export type MutationResult = { success: true; actionItems: ActionItem[] } | { success: false; error: string };

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
