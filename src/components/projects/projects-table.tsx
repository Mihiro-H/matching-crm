import Link from "next/link";
import {
  PROJECT_SORTABLE_COLUMNS,
  nextSortDirection,
  type ProjectSortColumn,
  type ProjectsListParams,
} from "@/lib/projects/list-params";
import type { ProjectListRow } from "@/lib/projects/get-projects";
import { PROJECT_STATUS_META } from "@/lib/status-badges";
import { StatusBadge } from "@/components/ui/status-badge";
import { SortFilterHeader } from "@/components/ui/sort-filter-header";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { searchUsers } from "@/lib/search-select/actions";
import { formatDateJa } from "@/lib/format";
import { PAGE_SIZE } from "@/lib/pagination";

const COLUMN_LABELS: Record<ProjectSortColumn, string> = {
  company: "企業名",
  title: "案件名",
  status: "ステータス",
  assignee: "主担当",
  endDate: "期間",
};

export function ProjectsTable({
  projects,
  params,
  totalCount,
}: {
  projects: ProjectListRow[];
  params: ProjectsListParams;
  totalCount: number;
}) {
  function hrefFor(overrides: { sort?: ProjectSortColumn; page?: number }) {
    const next = new URLSearchParams();
    next.set("view", params.view);
    next.set("sort", overrides.sort ?? params.sortBy);
    next.set("dir", overrides.sort ? nextSortDirection(params, overrides.sort) : params.sortDir);
    if (params.statusFilter) next.set("status", params.statusFilter);
    if (params.companyNameFilter) next.set("companyName", params.companyNameFilter);
    if (params.titleFilter) next.set("title", params.titleFilter);
    if (params.assigneeFilter) {
      next.set("assigneeId", params.assigneeFilter.id);
      next.set("assigneeName", params.assigneeFilter.name);
    }
    // ソート列を変更した場合は1ページ目に戻す(絞り込み結果が変わるため)。
    const page = overrides.page ?? (overrides.sort ? 1 : params.page);
    if (page > 1) next.set("page", String(page));
    return `/projects?${next.toString()}`;
  }

  // SortFilterHeaderはクライアントコンポーネントのため、関数(hrefFor)ではなく
  // 素のデータだけを渡す("use server"以外の関数はクライアントへ渡せないため)。
  const currentQuery: Record<string, string> = {
    view: params.view,
    sort: params.sortBy,
    dir: params.sortDir,
  };
  if (params.statusFilter) currentQuery.status = params.statusFilter;
  if (params.companyNameFilter) currentQuery.companyName = params.companyNameFilter;
  if (params.titleFilter) currentQuery.title = params.titleFilter;
  if (params.assigneeFilter) {
    currentQuery.assigneeId = params.assigneeFilter.id;
    currentQuery.assigneeName = params.assigneeFilter.name;
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-neutral-0">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-neutral-100">
            {PROJECT_SORTABLE_COLUMNS.map((column) => (
              <SortFilterHeader
                key={column}
                label={COLUMN_LABELS[column]}
                sortHref={hrefFor({ sort: column })}
                isSorted={params.sortBy === column}
                sortDir={params.sortDir}
                basePath="/projects"
                currentQuery={currentQuery}
                filter={
                  column === "company"
                    ? {
                        type: "text",
                        value: params.companyNameFilter,
                        placeholder: "企業名で検索",
                        paramName: "companyName",
                      }
                    : column === "title"
                      ? {
                          type: "text",
                          value: params.titleFilter,
                          placeholder: "案件名で検索",
                          paramName: "title",
                        }
                      : column === "assignee"
                        ? {
                            type: "person",
                            value: params.assigneeFilter,
                            modalTitle: "主担当で絞り込み",
                            search: searchUsers,
                            idParamName: "assigneeId",
                            nameParamName: "assigneeName",
                          }
                        : undefined
                }
              />
            ))}
          </tr>
        </thead>
        <tbody>
          {projects.map((project) => (
            <tr key={project.id} className="border-b border-neutral-100 last:border-0">
              <td className="px-4 py-3 text-neutral-600">
                <Link href={`/companies/${project.companyId}`} className="text-primary-600 hover:underline">
                  {project.companyName}
                </Link>
              </td>
              <td className="px-4 py-3">
                <Link href={`/projects/${project.number}`} className="text-primary-600 hover:underline">
                  {project.title}
                </Link>
              </td>
              <td className="px-4 py-3">
                <StatusBadge meta={PROJECT_STATUS_META[project.status]} />
              </td>
              <td className="px-4 py-3 text-neutral-600">{project.assigneeName ?? "未アサイン"}</td>
              <td className="px-4 py-3 text-neutral-600">
                {project.startDate || project.endDate
                  ? `${project.startDate ? formatDateJa(project.startDate) : "-"} 〜 ${
                      project.endDate ? formatDateJa(project.endDate) : "-"
                    }`
                  : "-"}
              </td>
            </tr>
          ))}
          {projects.length === 0 && (
            <tr>
              <td colSpan={PROJECT_SORTABLE_COLUMNS.length} className="px-4 py-8 text-center text-neutral-600">
                案件が登録されていません。
              </td>
            </tr>
          )}
        </tbody>
      </table>
      <PaginationControls
        page={params.page}
        totalCount={totalCount}
        pageSize={PAGE_SIZE}
        hrefFor={(page) => hrefFor({ page })}
      />
    </div>
  );
}
