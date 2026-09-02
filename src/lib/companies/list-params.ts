import type { CompanyStatus } from "@/lib/supabase/database.types";

export const COMPANY_SORTABLE_COLUMNS = [
  "name",
  "industry",
  "status",
  "latest_project",
  "assignee",
] as const;

export type CompanySortColumn = (typeof COMPANY_SORTABLE_COLUMNS)[number];
export type SortDirection = "asc" | "desc";

const VALID_STATUSES: CompanyStatus[] = ["negotiating", "active", "paused", "cold"];

export type CompaniesListParams = {
  sortBy: CompanySortColumn;
  sortDir: SortDirection;
  statusFilter: CompanyStatus | null;
};

/**
 * 企業一覧(SCREEN_SPEC.md 3章)のURLクエリパラメータを解釈する。
 * 不正な値はすべて安全なデフォルトにフォールバックする。
 */
export function parseCompaniesListParams(params: {
  sort?: string;
  dir?: string;
  status?: string;
}): CompaniesListParams {
  const sortBy = COMPANY_SORTABLE_COLUMNS.includes(params.sort as CompanySortColumn)
    ? (params.sort as CompanySortColumn)
    : "name";

  const sortDir: SortDirection = params.dir === "desc" ? "desc" : "asc";

  const statusFilter = VALID_STATUSES.includes(params.status as CompanyStatus)
    ? (params.status as CompanyStatus)
    : null;

  return { sortBy, sortDir, statusFilter };
}

/** 列ヘッダークリック時の次のソート方向を決める(同じ列なら反転、別の列ならasc) */
export function nextSortDirection(
  current: { sortBy: CompanySortColumn; sortDir: SortDirection },
  clickedColumn: CompanySortColumn
): SortDirection {
  if (current.sortBy !== clickedColumn) {
    return "asc";
  }
  return current.sortDir === "asc" ? "desc" : "asc";
}
