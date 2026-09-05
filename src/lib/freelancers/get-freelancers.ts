import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { JobCategory } from "@/lib/supabase/database.types";
import type { FreelancersListParams } from "./list-params";
import { rangeForPage } from "@/lib/pagination";

export type FreelancerListRow = {
  id: string;
  platformFreelancerId: string;
  name: string;
  email: string | null;
  jobCategories: JobCategory[] | null;
  lastImportedAt: string | null;
  /** 現在ステータスが「進行中」の案件にアサインされている数(freelancer_list_view参照) */
  activeProjectCount: number;
};

/**
 * フリーランス一覧(SCREEN_SPEC.md 9章、管理者限定・閲覧専用)。
 * 「進行中案件数」は project_role_assignments 等との集計が必要なため
 * freelancer_list_view (migration参照) で解決する。
 * 列見出しクリックの絞り込み(ID/氏名/メールのテキスト検索)、対応職種チップにも対応する。
 */
export async function getFreelancers(
  params: FreelancersListParams
): Promise<{ freelancers: FreelancerListRow[]; totalCount: number; error: string | null }> {
  const supabase = await createSupabaseServerClient();

  let query = supabase
    .from("freelancer_list_view")
    .select("id, platform_freelancer_id, name, email, job_categories, last_imported_at, active_project_count", {
      count: "exact",
    })
    .order(params.sortBy, { ascending: params.sortDir === "asc" });

  if (params.jobCategoryFilter) {
    query = query.contains("job_categories", [params.jobCategoryFilter]);
  }
  if (params.platformFreelancerIdFilter) {
    query = query.ilike("platform_freelancer_id", `%${params.platformFreelancerIdFilter}%`);
  }
  if (params.nameFilter) {
    query = query.ilike("name", `%${params.nameFilter}%`);
  }
  if (params.emailFilter) {
    query = query.ilike("email", `%${params.emailFilter}%`);
  }

  query = query.range(...rangeForPage(params.page));

  const { data, error, count } = await query;

  if (error) {
    return { freelancers: [], totalCount: 0, error: error.message };
  }

  return {
    freelancers: (data ?? []).map((row) => ({
      id: row.id,
      platformFreelancerId: row.platform_freelancer_id,
      name: row.name,
      email: row.email,
      jobCategories: row.job_categories,
      lastImportedAt: row.last_imported_at,
      activeProjectCount: row.active_project_count,
    })),
    totalCount: count ?? 0,
    error: null,
  };
}
