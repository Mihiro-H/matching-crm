import type { JobCategory } from "@/lib/supabase/database.types";
import { JOB_CATEGORIES } from "@/lib/job-categories";

export const FREELANCER_SORTABLE_COLUMNS = [
  "platform_freelancer_id",
  "name",
  "email",
  "active_project_count",
  "last_imported_at",
] as const;

export type FreelancerSortColumn = (typeof FREELANCER_SORTABLE_COLUMNS)[number];
export type SortDirection = "asc" | "desc";

export type FreelancersListParams = {
  sortBy: FreelancerSortColumn;
  sortDir: SortDirection;
  jobCategoryFilter: JobCategory | null;
  platformFreelancerIdFilter: string | null;
  nameFilter: string | null;
  emailFilter: string | null;
};

/**
 * フリーランス一覧(SCREEN_SPEC.md 9章)のURLクエリパラメータを解釈する。
 * 不正な値はすべて安全なデフォルトにフォールバックする。
 */
export function parseFreelancersListParams(params: {
  sort?: string;
  dir?: string;
  jobCategory?: string;
  platformFreelancerId?: string;
  name?: string;
  email?: string;
}): FreelancersListParams {
  const sortBy = FREELANCER_SORTABLE_COLUMNS.includes(params.sort as FreelancerSortColumn)
    ? (params.sort as FreelancerSortColumn)
    : "name";

  const sortDir: SortDirection = params.dir === "desc" ? "desc" : "asc";

  const jobCategoryFilter = JOB_CATEGORIES.includes(params.jobCategory as JobCategory)
    ? (params.jobCategory as JobCategory)
    : null;

  const platformFreelancerIdFilter = params.platformFreelancerId?.trim() || null;
  const nameFilter = params.name?.trim() || null;
  const emailFilter = params.email?.trim() || null;

  return { sortBy, sortDir, jobCategoryFilter, platformFreelancerIdFilter, nameFilter, emailFilter };
}

/** 列ヘッダークリック時の次のソート方向を決める(同じ列なら反転、別の列ならasc) */
export function nextSortDirection(
  current: { sortBy: FreelancerSortColumn; sortDir: SortDirection },
  clickedColumn: FreelancerSortColumn
): SortDirection {
  if (current.sortBy !== clickedColumn) {
    return "asc";
  }
  return current.sortDir === "asc" ? "desc" : "asc";
}
