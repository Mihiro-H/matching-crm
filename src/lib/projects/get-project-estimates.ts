import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";

export type ProjectEstimate = Database["public"]["Tables"]["estimates"]["Row"];

/** 案件詳細「見積・契約」関連タブ(SCREEN_SPEC.md 4章「関連タブ」)。estimatesはproject_idを直接持つ。 */
export async function getProjectEstimates(
  projectId: string
): Promise<{ estimates: ProjectEstimate[]; error: string | null }> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("estimates")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  if (error) {
    return { estimates: [], error: error.message };
  }
  return { estimates: data ?? [], error: null };
}
