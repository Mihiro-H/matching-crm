import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";

export type ProjectMeetingNote = Database["public"]["Tables"]["meeting_notes"]["Row"];

/** 案件詳細「議事録」関連タブ(SCREEN_SPEC.md 4章「関連タブ」)。meeting_notesはproject_idを直接持つ。 */
export async function getProjectMeetingNotes(
  projectId: string
): Promise<{ meetingNotes: ProjectMeetingNote[]; error: string | null }> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("meeting_notes")
    .select("*")
    .eq("project_id", projectId)
    .order("meeting_at", { ascending: false });

  if (error) {
    return { meetingNotes: [], error: error.message };
  }
  return { meetingNotes: data ?? [], error: null };
}
