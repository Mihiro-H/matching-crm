import Link from "next/link";
import {
  ESTIMATE_SORTABLE_COLUMNS,
  nextSortDirection,
  type EstimateSortColumn,
  type EstimatesListParams,
} from "@/lib/estimates/list-params";
import type { EstimateListRow } from "@/lib/estimates/get-estimates";
import { CONTRACT_STATUS_META } from "@/lib/status-badges";
import { StatusBadge } from "@/components/ui/status-badge";
import { SortFilterHeader } from "@/components/ui/sort-filter-header";
import { formatCurrencyJPY, formatDateJa } from "@/lib/format";

const COLUMN_LABELS: Record<EstimateSortColumn, string> = {
  company_name: "企業名",
  project_title: "案件名",
  document_type: "種別",
  amount: "金額",
  contract_status: "締結ステータス",
  created_at: "作成日",
};

const DOCUMENT_TYPE_LABELS = { estimate: "見積書", delivery_slip: "納品書" } as const;

export function EstimatesTable({
  estimates,
  params,
}: {
  estimates: EstimateListRow[];
  params: EstimatesListParams;
}) {
  function hrefFor(overrides: { sort?: EstimateSortColumn }) {
    const next = new URLSearchParams();
    next.set("sort", overrides.sort ?? params.sortBy);
    next.set("dir", overrides.sort ? nextSortDirection(params, overrides.sort) : params.sortDir);
    if (params.documentTypeFilter) next.set("documentType", params.documentTypeFilter);
    if (params.companyNameFilter) next.set("companyName", params.companyNameFilter);
    if (params.projectTitleFilter) next.set("projectTitle", params.projectTitleFilter);
    return `/estimates?${next.toString()}`;
  }

  // SortFilterHeaderはクライアントコンポーネントのため、関数(hrefFor)ではなく
  // 素のデータだけを渡す("use server"以外の関数はクライアントへ渡せないため)。
  const currentQuery: Record<string, string> = { sort: params.sortBy, dir: params.sortDir };
  if (params.documentTypeFilter) currentQuery.documentType = params.documentTypeFilter;
  if (params.companyNameFilter) currentQuery.companyName = params.companyNameFilter;
  if (params.projectTitleFilter) currentQuery.projectTitle = params.projectTitleFilter;

  return (
    <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-neutral-0">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-neutral-100">
            {ESTIMATE_SORTABLE_COLUMNS.map((column) => (
              <SortFilterHeader
                key={column}
                label={COLUMN_LABELS[column]}
                sortHref={hrefFor({ sort: column })}
                isSorted={params.sortBy === column}
                sortDir={params.sortDir}
                basePath="/estimates"
                currentQuery={currentQuery}
                filter={
                  column === "company_name"
                    ? {
                        type: "text",
                        value: params.companyNameFilter,
                        placeholder: "企業名で検索",
                        paramName: "companyName",
                      }
                    : column === "project_title"
                      ? {
                          type: "text",
                          value: params.projectTitleFilter,
                          placeholder: "案件名で検索",
                          paramName: "projectTitle",
                        }
                      : undefined
                }
              />
            ))}
          </tr>
        </thead>
        <tbody>
          {estimates.map((estimate) => (
            <tr key={estimate.id} className="border-b border-neutral-100 last:border-0">
              <td className="px-4 py-3 text-neutral-600">
                <Link href={`/companies/${estimate.companyId}`} className="text-primary-600 hover:underline">
                  {estimate.companyName}
                </Link>
              </td>
              <td className="px-4 py-3 text-neutral-900">
                <Link href={`/projects/${estimate.projectId}`} className="text-primary-600 hover:underline">
                  {estimate.projectTitle}
                </Link>
              </td>
              <td className="px-4 py-3 text-neutral-600">{DOCUMENT_TYPE_LABELS[estimate.documentType]}</td>
              <td className="px-4 py-3 text-neutral-600">{formatCurrencyJPY(estimate.amount)}</td>
              <td className="px-4 py-3">
                <StatusBadge meta={CONTRACT_STATUS_META[estimate.contractStatus]} />
              </td>
              <td className="px-4 py-3 text-neutral-600">{formatDateJa(estimate.createdAt)}</td>
            </tr>
          ))}
          {estimates.length === 0 && (
            <tr>
              <td colSpan={ESTIMATE_SORTABLE_COLUMNS.length} className="px-4 py-8 text-center text-neutral-600">
                見積・発注はまだありません。
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
