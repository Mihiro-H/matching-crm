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
import { formatDateJa } from "@/lib/format";

const COLUMN_LABELS: Record<ProjectSortColumn, string> = {
  company: "企業名",
  title: "案件名",
  status: "ステータス",
  assignee: "主担当",
  deadline: "納期",
};

export function ProjectsTable({
  projects,
  params,
}: {
  projects: ProjectListRow[];
  params: ProjectsListParams;
}) {
  function hrefFor(sort: ProjectSortColumn) {
    const next = new URLSearchParams();
    next.set("view", params.view);
    next.set("sort", sort);
    next.set("dir", nextSortDirection(params, sort));
    if (params.statusFilter) next.set("status", params.statusFilter);
    return `/projects?${next.toString()}`;
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-neutral-0">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-neutral-100">
            {PROJECT_SORTABLE_COLUMNS.map((column) => (
              <th key={column} className="px-4 py-3 font-medium text-neutral-600">
                <Link href={hrefFor(column)} className="hover:text-primary-600">
                  {COLUMN_LABELS[column]}
                  {params.sortBy === column && (params.sortDir === "asc" ? " ▲" : " ▼")}
                </Link>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {projects.map((project) => (
            <tr key={project.id} className="border-b border-neutral-100 last:border-0">
              <td className="px-4 py-3 text-neutral-600">{project.companyName}</td>
              <td className="px-4 py-3">
                <Link href={`/projects/${project.id}`} className="text-primary-600 hover:underline">
                  {project.title}
                </Link>
              </td>
              <td className="px-4 py-3">
                <StatusBadge meta={PROJECT_STATUS_META[project.status]} />
              </td>
              <td className="px-4 py-3 text-neutral-600">{project.assigneeName ?? "未アサイン"}</td>
              <td className="px-4 py-3 text-neutral-600">
                {project.deadline ? formatDateJa(project.deadline) : "-"}
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
    </div>
  );
}

