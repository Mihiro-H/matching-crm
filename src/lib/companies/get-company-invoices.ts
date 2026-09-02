import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { PaymentStatus } from "@/lib/supabase/database.types";

export type CompanyInvoiceRow = {
  id: string;
  amount: number;
  paymentStatus: PaymentStatus;
  dueDate: string | null;
  projectTitle: string;
};

/** 企業詳細「請求」タブ(SCREEN_SPEC.md 3章)。invoicesはcompany_idを直接持つ。 */
export async function getCompanyInvoices(
  companyId: string
): Promise<{ invoices: CompanyInvoiceRow[]; error: string | null }> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("invoices")
    .select("id, amount, payment_status, due_date, project:projects(title)")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });

  if (error) {
    return { invoices: [], error: error.message };
  }

  return {
    invoices: (data ?? []).map((row) => ({
      id: row.id,
      amount: row.amount,
      paymentStatus: row.payment_status,
      dueDate: row.due_date,
      projectTitle: row.project?.title ?? "(案件不明)",
    })),
    error: null,
  };
}
