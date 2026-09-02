import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";

export type ProjectInvoice = Database["public"]["Tables"]["invoices"]["Row"];

/** 案件詳細「請求」関連タブ(SCREEN_SPEC.md 4章「関連タブ」)。invoicesはproject_idを直接持つ。 */
export async function getProjectInvoices(
  projectId: string
): Promise<{ invoices: ProjectInvoice[]; error: string | null }> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("invoices")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  if (error) {
    return { invoices: [], error: error.message };
  }
  return { invoices: data ?? [], error: null };
}
