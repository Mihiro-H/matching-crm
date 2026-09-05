import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";

export type InvoiceDetail = Database["public"]["Tables"]["invoices"]["Row"] & {
  companyName: string;
  projectTitle: string;
};

export type PaymentStatusLogEntry = {
  occurredAt: string;
  status: "success" | "failed" | "retrying";
  payload: unknown;
};

export async function getInvoiceById(id: string): Promise<InvoiceDetail | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("invoices")
    .select("*, company:companies(name), project:projects(title)")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(`請求情報の取得に失敗しました: ${error.message}`);
  }
  if (!data) return null;

  const { company, project, ...invoice } = data;
  return {
    ...invoice,
    companyName: company?.name ?? "(企業不明)",
    projectTitle: project?.title ?? "(案件不明)",
  };
}

/**
 * 入金状況の変更履歴(SCREEN_SPEC.md 7章)。
 * invoicesテーブル自体に履歴カラムはないため、Misoca連携の実行ログである
 * integration_logs(related_entity_type='invoice')を履歴として表示する。
 */
export async function getInvoicePaymentStatusLog(invoiceId: string): Promise<PaymentStatusLogEntry[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("integration_logs")
    .select("occurred_at, status, payload")
    .eq("integration_type", "misoca")
    .eq("related_entity_type", "invoice")
    .eq("related_entity_id", invoiceId)
    .order("occurred_at", { ascending: false });

  if (error) return [];

  return (data ?? []).map((row) => ({
    occurredAt: row.occurred_at,
    status: row.status,
    payload: row.payload,
  }));
}
