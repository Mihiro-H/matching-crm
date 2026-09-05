import type { EstimateDocumentType } from "@/lib/supabase/database.types";

export const ESTIMATE_SORTABLE_COLUMNS = [
  "company_name",
  "project_title",
  "document_type",
  "amount",
  "contract_status",
  "created_at",
] as const;

export type EstimateSortColumn = (typeof ESTIMATE_SORTABLE_COLUMNS)[number];
export type SortDirection = "asc" | "desc";

const VALID_DOCUMENT_TYPES: EstimateDocumentType[] = ["estimate", "delivery_slip"];

export type EstimatesListParams = {
  sortBy: EstimateSortColumn;
  sortDir: SortDirection;
  documentTypeFilter: EstimateDocumentType | null;
  companyNameFilter: string | null;
  projectTitleFilter: string | null;
};

/**
 * 見積・発注一覧(SCREEN_SPEC.md 5章)のURLクエリパラメータを解釈する。
 * 不正な値はすべて安全なデフォルトにフォールバックする。
 * デフォルトは新着順(created_at desc、企業一覧/案件管理と違い、見積・発注は
 * 最近作成したものから確認するのが自然なため商談管理と同じ方針にする)。
 */
export function parseEstimatesListParams(params: {
  sort?: string;
  dir?: string;
  documentType?: string;
  companyName?: string;
  projectTitle?: string;
}): EstimatesListParams {
  const sortBy = ESTIMATE_SORTABLE_COLUMNS.includes(params.sort as EstimateSortColumn)
    ? (params.sort as EstimateSortColumn)
    : "created_at";

  const sortDir: SortDirection = params.dir === "asc" ? "asc" : "desc";

  const documentTypeFilter = VALID_DOCUMENT_TYPES.includes(params.documentType as EstimateDocumentType)
    ? (params.documentType as EstimateDocumentType)
    : null;

  const companyNameFilter = params.companyName?.trim() || null;
  const projectTitleFilter = params.projectTitle?.trim() || null;

  return { sortBy, sortDir, documentTypeFilter, companyNameFilter, projectTitleFilter };
}

/** 列ヘッダークリック時の次のソート方向を決める(同じ列なら反転、別の列ならasc) */
export function nextSortDirection(
  current: { sortBy: EstimateSortColumn; sortDir: SortDirection },
  clickedColumn: EstimateSortColumn
): SortDirection {
  if (current.sortBy !== clickedColumn) {
    return "asc";
  }
  return current.sortDir === "asc" ? "desc" : "asc";
}
