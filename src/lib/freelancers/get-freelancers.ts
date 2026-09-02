import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";

export type FreelancerRow = Database["public"]["Tables"]["freelancers"]["Row"];

/** フリーランス一覧(SCREEN_SPEC.md 9章、管理者限定・閲覧専用) */
export async function getFreelancers(): Promise<{ freelancers: FreelancerRow[]; error: string | null }> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("freelancers").select("*").order("name");

  if (error) {
    return { freelancers: [], error: error.message };
  }
  return { freelancers: data ?? [], error: null };
}
