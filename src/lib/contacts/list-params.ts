import type { ContactStatus } from "@/lib/supabase/database.types";

export const CONTACT_SORTABLE_COLUMNS = ["company", "name", "status", "source", "assignee", "createdAt"] as const;
export type ContactSortColumn = (typeof CONTACT_SORTABLE_COLUMNS)[number];
export type SortDirection = "asc" | "desc";

const VALID_STATUSES: ContactStatus[] = ["new", "in_progress", "negotiating", "won", "lost"];

export type ContactsListParams = {
  sortBy: ContactSortColumn;
  sortDir: SortDirection;
  statusFilter: ContactStatus | null;
  companyNameFilter: string | null;
  nameFilter: string | null;
  assigneeFilter: { id: string; name: string } | null;
};

/**
 * 商談・担当者管理一覧(SCREEN_SPEC.md 2章)のURLクエリパラメータを解釈する。
 * 不正な値はすべて安全なデフォルトにフォールバックする。
 * デフォルトは新着順(createdAt desc)。companies/projectsと違い、問い合わせは
 * 新しいものから確認するのが自然なため。
 */
export function parseContactsListParams(params: {
  sort?: string;
  dir?: string;
  status?: string;
  companyName?: string;
  name?: string;
  assigneeId?: string;
  assigneeName?: string;
}): ContactsListParams {
  const sortBy = CONTACT_SORTABLE_COLUMNS.includes(params.sort as ContactSortColumn)
    ? (params.sort as ContactSortColumn)
    : "createdAt";

  const sortDir: SortDirection = params.dir === "asc" ? "asc" : "desc";

  const statusFilter = VALID_STATUSES.includes(params.status as ContactStatus)
    ? (params.status as ContactStatus)
    : null;

  const companyNameFilter = params.companyName?.trim() || null;
  const nameFilter = params.name?.trim() || null;
  const assigneeFilter =
    params.assigneeId?.trim() && params.assigneeName?.trim()
      ? { id: params.assigneeId.trim(), name: params.assigneeName.trim() }
      : null;

  return { sortBy, sortDir, statusFilter, companyNameFilter, nameFilter, assigneeFilter };
}

/** 列ヘッダークリック時の次のソート方向を決める(同じ列なら反転、別の列ならasc) */
export function nextSortDirection(
  current: { sortBy: ContactSortColumn; sortDir: SortDirection },
  clickedColumn: ContactSortColumn
): SortDirection {
  if (current.sortBy !== clickedColumn) {
    return "asc";
  }
  return current.sortDir === "asc" ? "desc" : "asc";
}
