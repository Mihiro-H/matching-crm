import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { JobCategory, ProjectStatus } from "@/lib/supabase/database.types";
import type { ProjectsListParams, ProjectSortColumn } from "./list-params";
import { rangeForPage } from "@/lib/pagination";

export type ProjectListRow = {
  id: string;
  number: number;
  companyId: string;
  companyName: string;
  title: string;
  status: ProjectStatus;
  budget: number | null;
  startDate: string | null;
  endDate: string | null;
  assigneeName: string | null;
  roleSummary: { job_category: JobCategory; headcount: number }[];
};

const SORT_COLUMN_MAP: Record<ProjectSortColumn, string> = {
  company: "company_name",
  title: "title",
  status: "status",
  assignee: "assignee_name",
  endDate: "end_date",
};

/**
 * 案件管理一覧(SCREEN_SPEC.md 4章)のデータを取得する。
 * テーブルビュー・カンバンビュー共通(カンバンはstatusでグルーピングして使うため、
 * 全件表示が前提。ページネーションはテーブルビューのときのみ適用する)。
 * 列見出しクリックの絞り込み(企業名/案件名テキスト検索、主担当モーダル選択)にも対応する。
 */
export async function getProjects(
  params: Pick<
    ProjectsListParams,
    "view" | "sortBy" | "sortDir" | "statusFilter" | "companyNameFilter" | "titleFilter" | "assigneeFilter" | "page"
  >
): Promise<{ projects: ProjectListRow[]; totalCount: number; error: string | null }> {
  const supabase = await createSupabaseServerClient();

  let query = supabase
    .from("project_list_view")
    .select(
      "id, number, company_id, company_name, title, status, budget, start_date, end_date, assignee_name, role_summary",
      { count: "exact" }
    )
    .order(SORT_COLUMN_MAP[params.sortBy], { ascending: params.sortDir === "asc" });

  if (params.statusFilter) {
    query = query.eq("status", params.statusFilter);
  }
  if (params.companyNameFilter) {
    query = query.ilike("company_name", `%${params.companyNameFilter}%`);
  }
  if (params.titleFilter) {
    query = query.ilike("title", `%${params.titleFilter}%`);
  }
  if (params.assigneeFilter) {
    query = query.eq("assignee_id", params.assigneeFilter.id);
  }
  if (params.view === "table") {
    query = query.range(...rangeForPage(params.page));
  }

  const { data, error, count } = await query;

  if (error) {
    return { projects: [], totalCount: 0, error: error.message };
  }

  return {
    projects: (data ?? []).map((row) => ({
      id: row.id,
      number: row.number,
      companyId: row.company_id,
      companyName: row.company_name,
      title: row.title,
      status: row.status,
      budget: row.budget,
      startDate: row.start_date,
      endDate: row.end_date,
      assigneeName: row.assignee_name,
      roleSummary: row.role_summary,
    })),
    totalCount: count ?? 0,
    error: null,
  };
}
