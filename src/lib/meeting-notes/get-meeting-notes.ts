import { createSupabaseServerClient } from "@/lib/supabase/server";
import { excerpt } from "@/lib/format";
import { countPendingActionItems, parseActionItems } from "./action-items";

export type MeetingNoteCard = {
  id: string;
  title: string;
  meetingAt: string;
  companyName: string;
  projectId: string | null;
  aiSummaryExcerpt: string;
  pendingActionItemCount: number;
};

export type MeetingNotesFilter = {
  companyNameQuery: string;
  projectId: string | null;
  dateFrom: string | null;
  dateTo: string | null;
};

/**
 * 議事録一覧(SCREEN_SPEC.md 6章)。
 * 企業名は project_id→projects.company_id→companies.name、または
 * Google Drive取り込み時にフォルダ名から自動特定したcompany_id経由で解決する
 * (upload由来でproject_idがまだ無い議事録向け)。
 *
 * 企業名フィルターは複数の経路にまたがる集計値のため、PostgRESTの単純なilikeでは
 * 直接絞り込めない。MVPの想定件数ではアプリケーション層でフィルタする方針とする
 * (件数が増えたらDBビュー化を検討)。
 */
export async function getMeetingNotes(
  filter: MeetingNotesFilter
): Promise<{ notes: MeetingNoteCard[]; error: string | null }> {
  const supabase = await createSupabaseServerClient();

  let query = supabase
    .from("meeting_notes")
    .select(
      "id, title, meeting_at, ai_summary, action_items, project_id, project:projects(company:companies(name)), company:companies(name)"
    )
    .order("meeting_at", { ascending: false });

  if (filter.projectId) {
    query = query.eq("project_id", filter.projectId);
  }
  if (filter.dateFrom) {
    query = query.gte("meeting_at", filter.dateFrom);
  }
  if (filter.dateTo) {
    query = query.lte("meeting_at", filter.dateTo);
  }

  const { data, error } = await query;

  if (error) {
    return { notes: [], error: error.message };
  }

  const notes = (data ?? []).map((row) => {
    const companyName = row.project?.company?.name ?? row.company?.name ?? "(企業不明)";
    const actionItems = parseActionItems(row.action_items);

    return {
      id: row.id,
      title: row.title,
      meetingAt: row.meeting_at,
      companyName,
      projectId: row.project_id,
      aiSummaryExcerpt: excerpt(row.ai_summary, 60),
      pendingActionItemCount: countPendingActionItems(actionItems),
    };
  });

  const query_ = filter.companyNameQuery.trim().toLowerCase();
  const filtered = query_ ? notes.filter((n) => n.companyName.toLowerCase().includes(query_)) : notes;

  return { notes: filtered, error: null };
}

/** 一覧フィルターの「案件名」セレクト用の選択肢 */
export async function getProjectFilterOptions(): Promise<{ id: string; title: string }[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("projects").select("id, title").order("title");
  if (error) return [];
  return data ?? [];
}
