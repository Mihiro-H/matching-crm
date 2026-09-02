import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";

export type CompanyContactHistoryRow = Database["public"]["Tables"]["contacts"]["Row"];

/**
 * 企業詳細「担当者履歴」タブ(SCREEN_SPEC.md 3章)。
 * is_current降順 → started_at降順(null は最後)で表示する。
 */
export async function getCompanyContactHistory(
  companyId: string
): Promise<{ contacts: CompanyContactHistoryRow[]; error: string | null }> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("contacts")
    .select("*")
    .eq("company_id", companyId)
    .order("is_current", { ascending: false })
    .order("started_at", { ascending: false, nullsFirst: false });

  if (error) {
    return { contacts: [], error: error.message };
  }
  return { contacts: data ?? [], error: null };
}
