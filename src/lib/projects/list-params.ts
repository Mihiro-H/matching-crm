import type { ProjectStatus } from "@/lib/supabase/database.types";
import { PROJECT_STATUS_ORDER } from "./status-transitions";

export const PROJECT_VIEWS = ["table", "kanban"] as const;
export type ProjectView = (typeof PROJECT_VIEWS)[number];

export const PROJECT_SORTABLE_COLUMNS = ["company", "title", "status", "assignee", "deadline"] as const;
export type ProjectSortColumn = (typeof PROJECT_SORTABLE_COLUMNS)[number];
export type SortDirection = "asc" | "desc";

export type ProjectsListParams = {
  view: ProjectView;
  sortBy: ProjectSortColumn;
  sortDir: SortDirection;
  statusFilter: ProjectStatus | null;
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
}): ProjectsListParams {
  const view = PROJECT_VIEWS.includes(params.view as ProjectView)
    ? (params.view as ProjectView)
    : "table";

  const sortBy = PROJECT_SORTABLE_COLUMNS.includes(params.sort as ProjectSortColumn)
    ? (params.sort as ProjectSortColumn)
    : "deadline";

  const sortDir: SortDirection = params.dir === "desc" ? "desc" : "asc";

  const statusFilter = PROJECT_STATUS_ORDER.includes(params.status as ProjectStatus)
    ? (params.status as ProjectStatus)
    : null;

  return { view, sortBy, sortDir, statusFilter };
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
