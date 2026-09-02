import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { PaymentStatus } from "@/lib/supabase/database.types";

export type InvoiceListRow = {
  id: string;
  companyName: string;
  projectTitle: string;
  amount: number;
  issuedDate: string | null;
  paymentStatus: PaymentStatus;
};

/** 精算管理一覧(SCREEN_SPEC.md 7章、閲覧専用) */
export async function getInvoices(): Promise<{ invoices: InvoiceListRow[]; error: string | null }> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("invoices")
    .select("id, amount, issued_date, payment_status, company:companies(name), project:projects(title)")
    .order("created_at", { ascending: false });

  if (error) {
    return { invoices: [], error: error.message };
  }

  return {
    invoices: (data ?? []).map((row) => ({
      id: row.id,
      companyName: row.company?.name ?? "(企業不明)",
      projectTitle: row.project?.title ?? "(案件不明)",
      amount: row.amount,
      issuedDate: row.issued_date,
      paymentStatus: row.payment_status,
    })),
    error: null,
  };
}
