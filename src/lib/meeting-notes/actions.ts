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

export type LinkProjectResult = { success: true } | { success: false; error: string };

/**
 * Drive自動取り込み(source=upload)で企業までは特定できたが案件が未確定の議事録に、
 * 人が手動で案件を紐づける(SCREEN_SPEC.md 6章「議事録自動取り込み」)。
 *
 * UI(LinkProjectSection)はsearchProjectsByCompanyで議事録の企業配下の案件しか
 * 選ばせないが、Server Actionは直接呼び出せてしまうため、UI側の絞り込みに頼らず
 * サーバー側でも「案件の企業 = 議事録の企業」であることと、二重紐付けでないことを
 * 必ず検証する。
 */
export async function linkProjectToMeetingNote(
  meetingNoteId: string,
  projectId: string
): Promise<LinkProjectResult> {
  const authCheck = await requireEditAccess("meeting_notes");
  if (!authCheck.ok) return { success: false, error: authCheck.error };

  const supabase = await createSupabaseServerClient();

  const { data: note, error: noteError } = await supabase
    .from("meeting_notes")
    .select("id, project_id, company_id")
    .eq("id", meetingNoteId)
    .maybeSingle();
  if (noteError) return { success: false, error: noteError.message };
  if (!note || note.project_id !== null || !note.company_id) {
    return { success: false, error: "対象の議事録が見つからないか、既に案件が紐付け済みです。" };
  }

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("id, company_id")
    .eq("id", projectId)
    .maybeSingle();
  if (projectError) return { success: false, error: projectError.message };
  if (!project || project.company_id !== note.company_id) {
    return { success: false, error: "この議事録には紐付けられない案件です(企業が一致しません)。" };
  }

  const { error } = await supabase
    .from("meeting_notes")
    .update({ project_id: projectId })
    .eq("id", meetingNoteId)
    .is("project_id", null);

  if (error) return { success: false, error: error.message };

  revalidatePath(`/meeting-notes/${meetingNoteId}`);
  return { success: true };
}
