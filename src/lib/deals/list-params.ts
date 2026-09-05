import type { DealStatus } from "@/lib/supabase/database.types";
import { parsePageParam } from "@/lib/pagination";

export const DEAL_SORTABLE_COLUMNS = ["company", "name", "status", "source", "assignee", "createdAt"] as const;
export type DealSortColumn = (typeof DEAL_SORTABLE_COLUMNS)[number];
export type SortDirection = "asc" | "desc";

const VALID_STATUSES: DealStatus[] = [
  "new",
  "in_progress",
  "negotiating",
  "on_hold",
  "won",
  "estimate_submitted",
  "lost",
];

export type DealsListParams = {
  sortBy: DealSortColumn;
  sortDir: SortDirection;
  statusFilter: DealStatus | null;
  companyNameFilter: string | null;
  nameFilter: string | null;
  assigneeFilter: { id: string; name: string } | null;
  page: number;
};

/**
 * 商談管理一覧(SCREEN_SPEC.md「商談管理」)のURLクエリパラメータを解釈する。
 * 不正な値はすべて安全なデフォルトにフォールバックする。
 * デフォルトは新着順(createdAt desc)。企業一覧/案件管理と違い、商談は
 * 新しいものから確認するのが自然なため。
 */
export function parseDealsListParams(params: {
  sort?: string;
  dir?: string;
  status?: string;
  companyName?: string;
  name?: string;
  assigneeId?: string;
  assigneeName?: string;
  page?: string;
}): DealsListParams {
  const sortBy = DEAL_SORTABLE_COLUMNS.includes(params.sort as DealSortColumn)
    ? (params.sort as DealSortColumn)
    : "createdAt";

  const sortDir: SortDirection = params.dir === "asc" ? "asc" : "desc";

  const statusFilter = VALID_STATUSES.includes(params.status as DealStatus)
    ? (params.status as DealStatus)
    : null;

  const companyNameFilter = params.companyName?.trim() || null;
  const nameFilter = params.name?.trim() || null;
  const assigneeFilter =
    params.assigneeId?.trim() && params.assigneeName?.trim()
      ? { id: params.assigneeId.trim(), name: params.assigneeName.trim() }
      : null;

  return { sortBy, sortDir, statusFilter, companyNameFilter, nameFilter, assigneeFilter, page: parsePageParam(params.page) };
}

/** 列ヘッダークリック時の次のソート方向を決める(同じ列なら反転、別の列ならasc) */
export function nextSortDirection(
  current: { sortBy: DealSortColumn; sortDir: SortDirection },
  clickedColumn: DealSortColumn
): SortDirection {
  if (current.sortBy !== clickedColumn) {
    return "asc";
  }
  return current.sortDir === "asc" ? "desc" : "asc";
}
