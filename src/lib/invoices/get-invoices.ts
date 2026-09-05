import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { PaymentStatus } from "@/lib/supabase/database.types";
import { rangeForPage } from "@/lib/pagination";

export type InvoiceListRow = {
  id: string;
  companyName: string;
  projectTitle: string;
  amount: number;
  issuedDate: string | null;
  paymentStatus: PaymentStatus;
};

/** 精算管理一覧(SCREEN_SPEC.md 7章、閲覧専用) */
export async function getInvoices(
  page: number
): Promise<{ invoices: InvoiceListRow[]; totalCount: number; error: string | null }> {
  const supabase = await createSupabaseServerClient();
  const { data, error, count } = await supabase
    .from("invoices")
    .select("id, amount, issued_date, payment_status, company:companies(name), project:projects(title)", {
      count: "exact",
    })
    .order("created_at", { ascending: false })
    .range(...rangeForPage(page));

  if (error) {
    return { invoices: [], totalCount: 0, error: error.message };
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
    totalCount: count ?? 0,
    error: null,
  };
}
