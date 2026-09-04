import type { ProjectStatus } from "@/lib/supabase/database.types";
import { PROJECT_STATUS_ORDER } from "./status-transitions";

export const PROJECT_VIEWS = ["table", "kanban"] as const;
export type ProjectView = (typeof PROJECT_VIEWS)[number];

export const PROJECT_SORTABLE_COLUMNS = ["company", "title", "status", "assignee", "endDate"] as const;
export type ProjectSortColumn = (typeof PROJECT_SORTABLE_COLUMNS)[number];
export type SortDirection = "asc" | "desc";

export type ProjectsListParams = {
  view: ProjectView;
  sortBy: ProjectSortColumn;
  sortDir: SortDirection;
  statusFilter: ProjectStatus | null;
  companyNameFilter: string | null;
  titleFilter: string | null;
  assigneeFilter: { id: string; name: string } | null;
};

/**
 * 案件管理一覧(SCREEN_SPEC.md 4章)のURLクエリパラメータを解釈する。
 * 不正な値はすべて安全なデフォルトにフォールバックする。
 */
export function parseProjectsListParams(params: {
  view?: string;
  sort?: string;
  dir?: string;
  status?: string;
  companyName?: string;
  title?: string;
  assigneeId?: string;
  assigneeName?: string;
}): ProjectsListParams {
  const view = PROJECT_VIEWS.includes(params.view as ProjectView)
    ? (params.view as ProjectView)
    : "table";

  const sortBy = PROJECT_SORTABLE_COLUMNS.includes(params.sort as ProjectSortColumn)
    ? (params.sort as ProjectSortColumn)
    : "endDate";

  const sortDir: SortDirection = params.dir === "desc" ? "desc" : "asc";

  const statusFilter = PROJECT_STATUS_ORDER.includes(params.status as ProjectStatus)
    ? (params.status as ProjectStatus)
    : null;

  const companyNameFilter = params.companyName?.trim() || null;
  const titleFilter = params.title?.trim() || null;
  const assigneeFilter =
    params.assigneeId?.trim() && params.assigneeName?.trim()
      ? { id: params.assigneeId.trim(), name: params.assigneeName.trim() }
      : null;

  return { view, sortBy, sortDir, statusFilter, companyNameFilter, titleFilter, assigneeFilter };
}

export function nextSortDirection(
  current: { sortBy: ProjectSortColumn; sortDir: SortDirection },
  clickedColumn: ProjectSortColumn
): SortDirection {
  if (current.sortBy !== clickedColumn) {
    return "asc";
  }
  return current.sortDir === "asc" ? "desc" : "asc";
}
