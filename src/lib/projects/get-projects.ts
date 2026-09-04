import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { JobCategory, ProjectStatus } from "@/lib/supabase/database.types";
import type { ProjectsListParams, ProjectSortColumn } from "./list-params";

export type ProjectListRow = {
  id: string;
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
 * テーブルビュー・カンバンビュー共通(カンバンはstatusでグルーピングして使う)。
 * 列見出しクリックの絞り込み(企業名/案件名テキスト検索、主担当モーダル選択)にも対応する。
 */
export async function getProjects(
  params: Pick<
    ProjectsListParams,
    "sortBy" | "sortDir" | "statusFilter" | "companyNameFilter" | "titleFilter" | "assigneeFilter"
  >
): Promise<{ projects: ProjectListRow[]; error: string | null }> {
  const supabase = await createSupabaseServerClient();

  let query = supabase
    .from("project_list_view")
    .select("id, company_name, title, status, budget, start_date, end_date, assignee_name, role_summary")
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

  const { data, error } = await query;

  if (error) {
    return { projects: [], error: error.message };
  }

  return {
    projects: (data ?? []).map((row) => ({
      id: row.id,
      companyName: row.company_name,
      title: row.title,
      status: row.status,
      budget: row.budget,
      startDate: row.start_date,
      endDate: row.end_date,
      assigneeName: row.assignee_name,
      roleSummary: row.role_summary,
    })),
    error: null,
  };
}
