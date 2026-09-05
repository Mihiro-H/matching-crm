import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getMeetingNoteVisibility, isMeetingNoteVisible } from "./visibility";
import { parseActionItems, type ActionItem } from "./action-items";
import { parseSummarySections, type SummarySections } from "./summary-sections";

export type MeetingNoteDetail = {
  id: string;
  title: string;
  meetingAt: string;
  transcriptUrl: string | null;
  transcriptText: string | null;
  aiSummary: string;
  summarySections: SummarySections | null;
  actionItems: ActionItem[];
  projectId: string | null;
  projectNumber: number | null;
  dealId: string | null;
  dealNumber: number | null;
  companyName: string | null;
};

/**
 * 権限: 管理者以外は、自分が担当している商談・案件に紐づく議事録のみ取得できる
 * (visibility.ts参照)。対象外の場合はnullを返し、呼び出し元でnotFound()にする。
 */
export async function getMeetingNoteById(id: string): Promise<MeetingNoteDetail | null> {
  const supabase = await createSupabaseServerClient();
  const currentUser = await getCurrentUser();
  if (!currentUser) return null;

  const { data, error } = await supabase
    .from("meeting_notes")
    .select(
      `id, title, meeting_at, transcript_url, transcript_text, ai_summary, ai_summary_sections,
       action_items, project_id, deal_id,
       project:projects(number, company:companies(name)),
       deal:deals(number, person:people(company_name_raw, company:companies(name)))`
    )
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(`議事録の取得に失敗しました: ${error.message}`);
  }
  if (!data) return null;

  const visibility = await getMeetingNoteVisibility(currentUser);
  if (!isMeetingNoteVisible(visibility, { projectId: data.project_id, dealId: data.deal_id })) {
    return null;
  }

  return {
    id: data.id,
    title: data.title,
    meetingAt: data.meeting_at,
    transcriptUrl: data.transcript_url,
    transcriptText: data.transcript_text,
    aiSummary: data.ai_summary,
    summarySections: parseSummarySections(data.ai_summary_sections),
    actionItems: parseActionItems(data.action_items),
    projectId: data.project_id,
    projectNumber: data.project?.number ?? null,
    dealId: data.deal_id,
    dealNumber: data.deal?.number ?? null,
    companyName: data.project?.company?.name ?? data.deal?.person?.company?.name ?? data.deal?.person?.company_name_raw ?? null,
  };
}
