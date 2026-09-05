import { createSupabaseServerClient } from "@/lib/supabase/server";
import { excerpt } from "@/lib/format";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getMeetingNoteVisibility, isMeetingNoteVisible } from "./visibility";
import { countPendingActionItems, parseActionItems } from "./action-items";
import { rangeForPage } from "@/lib/pagination";

export type MeetingNoteCard = {
  id: string;
  title: string;
  meetingAt: string;
  companyName: string;
  projectId: string | null;
  dealId: string | null;
  aiSummaryExcerpt: string;
  pendingActionItemCount: number;
};

export type MeetingNotesFilter = {
  companyNameQuery: string;
  projectId: string | null;
  dateFrom: string | null;
  dateTo: string | null;
  page: number;
};

/**
 * 議事録一覧(SCREEN_SPEC.md 6章)。
 * 企業名は project_id→projects.company_id→companies.name、または
 * deal_id→deals.person→people.company(なければcompany_name_raw)経由で解決する。
 *
 * 権限: 管理者以外は、自分が担当している商談・案件に紐づく議事録のみ表示する
 * (visibility.ts参照)。
 *
 * 企業名フィルターは複数の経路にまたがる集計値のため、PostgRESTの単純なilikeでは
 * 直接絞り込めない。MVPの想定件数ではアプリケーション層でフィルタする方針とする
 * (件数が増えたらDBビュー化を検討)。
 * ページネーションについても同様の理由でDBの.range()は使えない
 * (可視性・企業名フィルター適用後の件数でページングする必要があるため)、
 * アプリケーション層でのフィルタ後にスライスする。
 */
export async function getMeetingNotes(
  filter: MeetingNotesFilter
): Promise<{ notes: MeetingNoteCard[]; totalCount: number; error: string | null }> {
  const supabase = await createSupabaseServerClient();
  const currentUser = await getCurrentUser();
  if (!currentUser) return { notes: [], totalCount: 0, error: null };
  const visibility = await getMeetingNoteVisibility(currentUser);

  let query = supabase
    .from("meeting_notes")
    .select(
      `id, title, meeting_at, ai_summary, action_items, project_id, deal_id,
       project:projects(company:companies(name)),
       deal:deals(person:people(company_name_raw, company:companies(name)))`
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
    return { notes: [], totalCount: 0, error: error.message };
  }

  const notes = (data ?? [])
    .filter((row) => isMeetingNoteVisible(visibility, { projectId: row.project_id, dealId: row.deal_id }))
    .map((row) => {
      const companyName =
        row.project?.company?.name ??
        row.deal?.person?.company?.name ??
        row.deal?.person?.company_name_raw ??
        "(企業不明)";
      const actionItems = parseActionItems(row.action_items);

      return {
        id: row.id,
        title: row.title,
        meetingAt: row.meeting_at,
        companyName,
        projectId: row.project_id,
        dealId: row.deal_id,
        aiSummaryExcerpt: excerpt(row.ai_summary, 60),
        pendingActionItemCount: countPendingActionItems(actionItems),
      };
    });

  const query_ = filter.companyNameQuery.trim().toLowerCase();
  const filtered = query_ ? notes.filter((n) => n.companyName.toLowerCase().includes(query_)) : notes;

  // DB側の.range()は使えないため(上記コメント参照)、フィルタ後の配列を
  // アプリケーション層でページングする。
  const [from, to] = rangeForPage(filter.page);
  const paged = filtered.slice(from, to + 1);

  return { notes: paged, totalCount: filtered.length, error: null };
}

/** 一覧フィルターの「案件名」セレクト用の選択肢 */
export async function getProjectFilterOptions(): Promise<{ id: string; title: string }[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("projects").select("id, title").order("title");
  if (error) return [];
  return data ?? [];
}
