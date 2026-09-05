import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";

export type ProjectDetail = Database["public"]["Tables"]["projects"]["Row"] & {
  companyName: string;
  /** 請求書発行済みの案件かどうか(SCREEN_SPEC.md 4章: 請求済案件の金額変更時の警告用)。 */
  hasInvoices: boolean;
};

export async function getProjectById(id: string): Promise<ProjectDetail | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("projects")
    .select("*, company:companies(name)")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(`案件情報の取得に失敗しました: ${error.message}`);
  }
  if (!data) return null;

  const { data: invoiceRows, error: invoiceError } = await supabase
    .from("invoices")
    .select("id")
    .eq("project_id", id)
    .limit(1);
  if (invoiceError) {
    throw new Error(`請求書情報の取得に失敗しました: ${invoiceError.message}`);
  }

  const { company, ...project } = data;
  return {
    ...project,
    companyName: company?.name ?? "(企業不明)",
    hasInvoices: (invoiceRows ?? []).length > 0,
  };
}
