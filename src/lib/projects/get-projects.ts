import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { JobCategory, ProjectStatus } from "@/lib/supabase/database.types";
import type { ProjectsListParams, ProjectSortColumn } from "./list-params";

export type ProjectListRow = {
  id: string;
  companyName: string;
  title: string;
  status: ProjectStatus;
  budget: number | null;
  deadline: string | null;
  assigneeName: string | null;
  roleSummary: { job_category: JobCategory; headcount: number }[];
};

const SORT_COLUMN_MAP: Record<ProjectSortColumn, string> = {
  company: "company_name",
  title: "title",
  status: "status",
  assignee: "assignee_name",
  deadline: "deadline",
};

/**
 * 案件管理一覧(SCREEN_SPEC.md 4章)のデータを取得する。
 * テーブルビュー・カンバンビュー共通(カンバンはstatusでグルーピングして使う)。
 */
export async function getProjects(
  params: Pick<ProjectsListParams, "sortBy" | "sortDir" | "statusFilter">
): Promise<{ projects: ProjectListRow[]; error: string | null }> {
  const supabase = await createSupabaseServerClient();

  let query = supabase
    .from("project_list_view")
    .select("id, company_name, title, status, budget, deadline, assignee_name, role_summary")
    .order(SORT_COLUMN_MAP[params.sortBy], { ascending: params.sortDir === "asc" });

  if (params.statusFilter) {
    query = query.eq("status", params.statusFilter);
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
      deadline: row.deadline,
      assigneeName: row.assignee_name,
      roleSummary: row.role_summary,
    })),
    error: null,
  };
}
