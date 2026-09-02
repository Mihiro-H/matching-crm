import { createSupabaseServerClient } from "@/lib/supabase/server";
import { parseActionItems, type ActionItem } from "./action-items";

export type MeetingNoteDetail = {
  id: string;
  title: string;
  meetingAt: string;
  transcriptUrl: string | null;
  aiSummary: string;
  actionItems: ActionItem[];
};

export async function getMeetingNoteById(id: string): Promise<MeetingNoteDetail | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("meeting_notes")
    .select("id, title, meeting_at, transcript_url, ai_summary, action_items")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(`議事録の取得に失敗しました: ${error.message}`);
  }
  if (!data) return null;

  return {
    id: data.id,
    title: data.title,
    meetingAt: data.meeting_at,
    transcriptUrl: data.transcript_url,
    aiSummary: data.ai_summary,
    actionItems: parseActionItems(data.action_items),
  };
}
