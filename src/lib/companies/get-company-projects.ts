import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";

export type CompanyProject = Database["public"]["Tables"]["projects"]["Row"];

/** 企業詳細「案件」タブ(SCREEN_SPEC.md 3章) */
export async function getCompanyProjects(
  companyId: string
): Promise<{ projects: CompanyProject[]; error: string | null }> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });

  if (error) {
    return { projects: [], error: error.message };
  }
  return { projects: data ?? [], error: null };
}
