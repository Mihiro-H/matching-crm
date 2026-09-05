import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { CompaniesListParams } from "./list-params";
import { rangeForPage } from "@/lib/pagination";

export type CompanyListRow = {
  id: string;
  name: string;
  industry: string | null;
  latestProjectTitle: string | null;
};

const SORT_COLUMN_MAP: Record<CompaniesListParams["sortBy"], string> = {
  name: "name",
  industry: "industry",
  latest_project: "latest_project_title",
};

/**
 * 企業一覧(SCREEN_SPEC.md 3章)のテーブル表示用データを取得する。
 * 「直近の案件」列は company_list_view (migration参照) で解決する。
 * 列見出しクリックの絞り込み(企業名テキスト検索)にも対応する。
 */
export async function getCompanies(
  params: CompaniesListParams
): Promise<{ companies: CompanyListRow[]; totalCount: number; error: string | null }> {
  const supabase = await createSupabaseServerClient();

  let query = supabase
    .from("company_list_view")
    .select("id, name, industry, latest_project_title", { count: "exact" })
    .order(SORT_COLUMN_MAP[params.sortBy], { ascending: params.sortDir === "asc" });

  if (params.nameFilter) {
    query = query.ilike("name", `%${params.nameFilter}%`);
  }

  query = query.range(...rangeForPage(params.page));

  const { data, error, count } = await query;

  if (error) {
    return { companies: [], totalCount: 0, error: error.message };
  }

  return {
    companies: (data ?? []).map((row) => ({
      id: row.id,
      name: row.name,
      industry: row.industry,
      latestProjectTitle: row.latest_project_title,
    })),
    totalCount: count ?? 0,
    error: null,
  };
}
