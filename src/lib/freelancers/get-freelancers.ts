import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { JobCategory } from "@/lib/supabase/database.types";

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
 */
export async function getFreelancers(): Promise<{ freelancers: FreelancerListRow[]; error: string | null }> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("freelancer_list_view")
    .select("id, platform_freelancer_id, name, email, job_categories, last_imported_at, active_project_count")
    .order("name");

  if (error) {
    return { freelancers: [], error: error.message };
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
    error: null,
  };
}
