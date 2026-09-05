import Link from "next/link";
import {
  FREELANCER_SORTABLE_COLUMNS,
  nextSortDirection,
  type FreelancerSortColumn,
  type FreelancersListParams,
} from "@/lib/freelancers/list-params";
import type { FreelancerListRow } from "@/lib/freelancers/get-freelancers";
import { JOB_CATEGORY_LABELS, JOB_CATEGORY_TAG_STYLES } from "@/lib/job-categories";
import { SortFilterHeader } from "@/components/ui/sort-filter-header";
import { formatDateTimeJa } from "@/lib/format";

const COLUMN_LABELS: Record<FreelancerSortColumn, string> = {
  platform_freelancer_id: "ID",
  name: "氏名",
  email: "メール",
  active_project_count: "進行中案件数",
  last_imported_at: "最終インポート日時",
};

export function FreelancersTable({
  freelancers,
  params,
}: {
  freelancers: FreelancerListRow[];
  params: FreelancersListParams;
}) {
  function hrefFor(overrides: { sort?: FreelancerSortColumn }) {
    const next = new URLSearchParams();
    next.set("sort", overrides.sort ?? params.sortBy);
    next.set("dir", overrides.sort ? nextSortDirection(params, overrides.sort) : params.sortDir);
    if (params.jobCategoryFilter) next.set("jobCategory", params.jobCategoryFilter);
    if (params.platformFreelancerIdFilter) next.set("platformFreelancerId", params.platformFreelancerIdFilter);
    if (params.nameFilter) next.set("name", params.nameFilter);
    if (params.emailFilter) next.set("email", params.emailFilter);
    return `/freelancers?${next.toString()}`;
  }

  // SortFilterHeaderはクライアントコンポーネントのため、関数(hrefFor)ではなく
  // 素のデータだけを渡す("use server"以外の関数はクライアントへ渡せないため)。
  const currentQuery: Record<string, string> = { sort: params.sortBy, dir: params.sortDir };
  if (params.jobCategoryFilter) currentQuery.jobCategory = params.jobCategoryFilter;
  if (params.platformFreelancerIdFilter) currentQuery.platformFreelancerId = params.platformFreelancerIdFilter;
  if (params.nameFilter) currentQuery.name = params.nameFilter;
  if (params.emailFilter) currentQuery.email = params.emailFilter;

  return (
    <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-neutral-0">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-neutral-100">
            {FREELANCER_SORTABLE_COLUMNS.map((column) => (
              <SortFilterHeader
                key={column}
                label={COLUMN_LABELS[column]}
                sortHref={hrefFor({ sort: column })}
                isSorted={params.sortBy === column}
                sortDir={params.sortDir}
                basePath="/freelancers"
                currentQuery={currentQuery}
                filter={
                  column === "platform_freelancer_id"
                    ? {
                        type: "text",
                        value: params.platformFreelancerIdFilter,
                        placeholder: "IDで検索",
                        paramName: "platformFreelancerId",
                      }
                    : column === "name"
                      ? { type: "text", value: params.nameFilter, placeholder: "氏名で検索", paramName: "name" }
                      : column === "email"
                        ? { type: "text", value: params.emailFilter, placeholder: "メールで検索", paramName: "email" }
                        : undefined
                }
              />
            ))}
            <th className="px-4 py-3 font-medium text-neutral-600">対応職種</th>
          </tr>
        </thead>
        <tbody>
          {freelancers.map((freelancer) => (
            <tr key={freelancer.id} className="border-b border-neutral-100 last:border-0">
              <td className="px-4 py-3 text-neutral-600">{freelancer.platformFreelancerId}</td>
              <td className="px-4 py-3">
                <Link href={`/freelancers/${freelancer.id}`} className="text-primary-600 hover:underline">
                  {freelancer.name}
                </Link>
              </td>
              <td className="px-4 py-3 text-neutral-600">{freelancer.email ?? "-"}</td>
              <td className="px-4 py-3 text-neutral-600">{freelancer.activeProjectCount}</td>
              <td className="px-4 py-3 text-neutral-600">
                {freelancer.lastImportedAt ? formatDateTimeJa(freelancer.lastImportedAt) : "-"}
              </td>
              <td className="px-4 py-3">
                {freelancer.jobCategories && freelancer.jobCategories.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {freelancer.jobCategories.map((c) => (
                      <span key={c} className={`rounded-sm px-2 py-0.5 text-xs ${JOB_CATEGORY_TAG_STYLES[c]}`}>
                        {JOB_CATEGORY_LABELS[c]}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-neutral-600">-</span>
                )}
              </td>
            </tr>
          ))}
          {freelancers.length === 0 && (
            <tr>
              <td colSpan={FREELANCER_SORTABLE_COLUMNS.length + 1} className="px-4 py-8 text-center text-neutral-600">
                フリーランスが登録されていません。CSVで一括更新してください。
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
