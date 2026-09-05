import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ContractStatus, EstimateDocumentType } from "@/lib/supabase/database.types";
import type { EstimatesListParams } from "./list-params";
import { rangeForPage } from "@/lib/pagination";

export type EstimateListRow = {
  id: string;
  companyId: string;
  companyName: string;
  projectId: string;
  projectNumber: number;
  projectTitle: string;
  documentType: EstimateDocumentType;
  amount: number;
  contractStatus: ContractStatus;
  createdAt: string;
};

/**
 * 見積・発注一覧(SCREEN_SPEC.md 5章)のテーブル表示用データを取得する。
 * 「企業名」「案件名」列は estimate_list_view (migration参照) で解決する。
 * 列見出しクリックの絞り込み(企業名/案件名テキスト検索、種別チップ)にも対応する。
 */
export async function getEstimates(
  params: EstimatesListParams
): Promise<{ estimates: EstimateListRow[]; totalCount: number; error: string | null }> {
  const supabase = await createSupabaseServerClient();

  let query = supabase
    .from("estimate_list_view")
    .select(
      "id, document_type, amount, contract_status, created_at, project_id, project_title, project_number, company_id, company_name",
      { count: "exact" }
    )
    .order(params.sortBy, { ascending: params.sortDir === "asc" });

  if (params.documentTypeFilter) {
    query = query.eq("document_type", params.documentTypeFilter);
  }
  if (params.companyNameFilter) {
    query = query.ilike("company_name", `%${params.companyNameFilter}%`);
  }
  if (params.projectTitleFilter) {
    query = query.ilike("project_title", `%${params.projectTitleFilter}%`);
  }

  query = query.range(...rangeForPage(params.page));

  const { data, error, count } = await query;

  if (error) {
    return { estimates: [], totalCount: 0, error: error.message };
  }

  return {
    estimates: (data ?? []).map((row) => ({
      id: row.id,
      companyId: row.company_id,
      companyName: row.company_name,
      projectId: row.project_id,
      projectNumber: row.project_number,
      projectTitle: row.project_title,
      documentType: row.document_type,
      amount: row.amount,
      contractStatus: row.contract_status,
      createdAt: row.created_at,
    })),
    totalCount: count ?? 0,
    error: null,
  };
}
