import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ContractStatus, EstimateDocumentType } from "@/lib/supabase/database.types";

export type EstimateListRow = {
  id: string;
  companyName: string;
  projectTitle: string;
  documentType: EstimateDocumentType;
  amount: number;
  contractStatus: ContractStatus;
};

/** 見積・発注一覧(SCREEN_SPEC.md 5章) */
export async function getEstimates(): Promise<{ estimates: EstimateListRow[]; error: string | null }> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("estimates")
    .select("id, document_type, amount, contract_status, project:projects(title, company:companies(name))")
    .order("created_at", { ascending: false });

  if (error) {
    return { estimates: [], error: error.message };
  }

  return {
    estimates: (data ?? []).map((row) => ({
      id: row.id,
      companyName: row.project?.company?.name ?? "(企業不明)",
      projectTitle: row.project?.title ?? "(案件不明)",
      documentType: row.document_type,
      amount: row.amount,
      contractStatus: row.contract_status,
    })),
    error: null,
  };
}
