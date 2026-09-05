export const COMPANY_SORTABLE_COLUMNS = ["name", "industry", "latest_project"] as const;

export type CompanySortColumn = (typeof COMPANY_SORTABLE_COLUMNS)[number];
export type SortDirection = "asc" | "desc";

export type CompaniesListParams = {
  sortBy: CompanySortColumn;
  sortDir: SortDirection;
  nameFilter: string | null;
};

/**
 * 企業一覧(SCREEN_SPEC.md 3章)のURLクエリパラメータを解釈する。
 * 不正な値はすべて安全なデフォルトにフォールバックする。
 * ステータス・担当者は廃止した(企業は商談・案件が実体を持つため、企業自体には
 * 持たせない)。
 */
export function parseCompaniesListParams(params: {
  sort?: string;
  dir?: string;
  name?: string;
}): CompaniesListParams {
  const sortBy = COMPANY_SORTABLE_COLUMNS.includes(params.sort as CompanySortColumn)
    ? (params.sort as CompanySortColumn)
    : "name";

  const sortDir: SortDirection = params.dir === "desc" ? "desc" : "asc";

  const nameFilter = params.name?.trim() || null;

  return { sortBy, sortDir, nameFilter };
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
