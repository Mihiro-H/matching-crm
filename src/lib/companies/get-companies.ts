import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { CompaniesListParams } from "./list-params";

export type CompanyListRow = {
  id: string;
  name: string;
  industry: string | null;
  status: string;
  latestProjectTitle: string | null;
  assigneeName: string | null;
};

const SORT_COLUMN_MAP: Record<CompaniesListParams["sortBy"], string> = {
  name: "name",
  industry: "industry",
  status: "status",
  latest_project: "latest_project_title",
  assignee: "assignee_name",
};

/**
 * 企業一覧(SCREEN_SPEC.md 3章)のテーブル表示用データを取得する。
 * 「直近の案件」「担当者」列は company_list_view (migration参照) で解決する。
 * 列見出しクリックの絞り込み(企業名テキスト検索/担当者モーダル選択)にも対応する。
 */
export async function getCompanies(
  params: CompaniesListParams
): Promise<{ companies: CompanyListRow[]; error: string | null }> {
  const supabase = await createSupabaseServerClient();

  let query = supabase
    .from("company_list_view")
    .select("id, name, industry, status, latest_project_title, assignee_name")
    .order(SORT_COLUMN_MAP[params.sortBy], { ascending: params.sortDir === "asc" });

  if (params.statusFilter) {
    query = query.eq("status", params.statusFilter);
  }
  if (params.nameFilter) {
    query = query.ilike("name", `%${params.nameFilter}%`);
  }
  if (params.assigneeFilter) {
    query = query.eq("assignee_id", params.assigneeFilter.id);
  }

  const { data, error } = await query;

  if (error) {
    return { companies: [], error: error.message };
  }

  return {
    companies: (data ?? []).map((row) => ({
      id: row.id,
      name: row.name,
      industry: row.industry,
      status: row.status,
      latestProjectTitle: row.latest_project_title,
      assigneeName: row.assignee_name,
    })),
    error: null,
  };
}
