import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";

export type DealMeetingNote = Database["public"]["Tables"]["meeting_notes"]["Row"];

/** 商談詳細「関連議事録」タブ(SCREEN_SPEC.md「商談管理」)。meeting_notesはdeal_idを直接持つ。 */
export async function getMeetingNotesForDeal(
  dealId: string
): Promise<{ meetingNotes: DealMeetingNote[]; error: string | null }> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("meeting_notes")
    .select("*")
    .eq("deal_id", dealId)
    .order("meeting_at", { ascending: false });

  if (error) return { meetingNotes: [], error: error.message };
  return { meetingNotes: data ?? [], error: null };
}
