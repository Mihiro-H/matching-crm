import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ContractStatus, EstimateDocumentType } from "@/lib/supabase/database.types";

export type CompanyEstimateRow = {
  id: string;
  documentType: EstimateDocumentType;
  amount: number;
  contractStatus: ContractStatus;
  projectTitle: string;
};

/**
 * 企業詳細「見積・契約」タブ(SCREEN_SPEC.md 3章)。
 * estimatesはcompany_idを持たずproject_id経由でしか辿れないため、
 * projectsに!innerで結合してcompany_idを絞り込む。
 */
export async function getCompanyEstimates(
  companyId: string
): Promise<{ estimates: CompanyEstimateRow[]; error: string | null }> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("estimates")
    .select("id, document_type, amount, contract_status, project:projects!inner(title, company_id)")
    .eq("project.company_id", companyId)
    .order("created_at", { ascending: false });

  if (error) {
    return { estimates: [], error: error.message };
  }

  return {
    estimates: (data ?? []).map((row) => ({
      id: row.id,
      documentType: row.document_type,
      amount: row.amount,
      contractStatus: row.contract_status,
      projectTitle: row.project?.title ?? "(案件不明)",
    })),
    error: null,
  };
}
