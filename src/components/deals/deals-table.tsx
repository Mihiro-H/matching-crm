import Link from "next/link";
import {
  DEAL_SORTABLE_COLUMNS,
  nextSortDirection,
  type DealSortColumn,
  type DealsListParams,
} from "@/lib/deals/list-params";
import type { DealListRow } from "@/lib/deals/get-deals";
import { DEAL_STATUS_META } from "@/lib/status-badges";
import { StatusBadge } from "@/components/ui/status-badge";
import { SortFilterHeader } from "@/components/ui/sort-filter-header";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { searchUsers } from "@/lib/search-select/actions";
import { JOB_CATEGORY_LABELS, JOB_CATEGORY_TAG_STYLES } from "@/lib/job-categories";
import { formatDateJa } from "@/lib/format";
import { PAGE_SIZE } from "@/lib/pagination";

const COLUMN_LABELS: Record<DealSortColumn, string> = {
  company: "企業名",
  name: "担当者名",
  status: "ステータス",
  source: "流入経路",
  assignee: "主担当",
  createdAt: "初回問合せ日",
};

const SOURCE_LABELS: Record<string, string> = {
  form: "フォーム",
  referral: "紹介",
  other: "その他",
};

export function DealsTable({
  deals,
  params,
  totalCount,
}: {
  deals: DealListRow[];
  params: DealsListParams;
  totalCount: number;
}) {
  function hrefFor(overrides: { sort?: DealSortColumn; page?: number }) {
    const next = new URLSearchParams();
    next.set("sort", overrides.sort ?? params.sortBy);
    next.set("dir", overrides.sort ? nextSortDirection(params, overrides.sort) : params.sortDir);
    if (params.statusFilter) next.set("status", params.statusFilter);
    if (params.companyNameFilter) next.set("companyName", params.companyNameFilter);
    if (params.nameFilter) next.set("name", params.nameFilter);
    if (params.assigneeFilter) {
      next.set("assigneeId", params.assigneeFilter.id);
      next.set("assigneeName", params.assigneeFilter.name);
    }
    // ソート列を変更した場合は1ページ目に戻す(絞り込み結果が変わるため)。
    const page = overrides.page ?? (overrides.sort ? 1 : params.page);
    if (page > 1) next.set("page", String(page));
    return `/deals?${next.toString()}`;
  }

  // SortFilterHeaderはクライアントコンポーネントのため、関数(hrefFor)ではなく
  // 素のデータだけを渡す("use server"以外の関数はクライアントへ渡せないため)。
  const currentQuery: Record<string, string> = { sort: params.sortBy, dir: params.sortDir };
  if (params.statusFilter) currentQuery.status = params.statusFilter;
  if (params.companyNameFilter) currentQuery.companyName = params.companyNameFilter;
  if (params.nameFilter) currentQuery.name = params.nameFilter;
  if (params.assigneeFilter) {
    currentQuery.assigneeId = params.assigneeFilter.id;
    currentQuery.assigneeName = params.assigneeFilter.name;
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-neutral-0">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-neutral-100">
            {DEAL_SORTABLE_COLUMNS.map((column) => (
              <SortFilterHeader
                key={column}
                label={COLUMN_LABELS[column]}
                sortHref={hrefFor({ sort: column })}
                isSorted={params.sortBy === column}
                sortDir={params.sortDir}
                basePath="/deals"
                currentQuery={currentQuery}
                filter={
                  column === "company"
                    ? {
                        type: "text",
                        value: params.companyNameFilter,
                        placeholder: "企業名で検索",
                        paramName: "companyName",
                      }
                    : column === "name"
                      ? {
                          type: "text",
                          value: params.nameFilter,
                          placeholder: "担当者名で検索",
                          paramName: "name",
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
            <th className="px-4 py-3 font-medium text-neutral-600">依頼職種</th>
          </tr>
        </thead>
        <tbody>
          {deals.map((deal) => (
            <tr key={deal.id} className="border-b border-neutral-100 last:border-0">
              <td className="px-4 py-3 text-neutral-600">
                {deal.companyId ? (
                  <Link href={`/companies/${deal.companyId}`} className="text-primary-600 hover:underline">
                    {deal.companyName}
                  </Link>
                ) : (
                  deal.companyName
                )}
              </td>
              <td className="px-4 py-3">
                <Link href={`/deals/${deal.number}`} className="text-primary-600 hover:underline">
                  {deal.name}
                </Link>
              </td>
              <td className="px-4 py-3">
                <StatusBadge meta={DEAL_STATUS_META[deal.status]} />
              </td>
              <td className="px-4 py-3 text-neutral-600">
                {SOURCE_LABELS[deal.source] ?? deal.source}
              </td>
              <td className="px-4 py-3 text-neutral-600">{deal.assigneeName ?? "未アサイン"}</td>
              <td className="px-4 py-3 text-neutral-600">{formatDateJa(deal.createdAt)}</td>
              <td className="px-4 py-3">
                {deal.jobCategories.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {deal.jobCategories.map((category) => (
                      <span
                        key={category}
                        className={`rounded-sm px-2 py-0.5 text-xs ${JOB_CATEGORY_TAG_STYLES[category]}`}
                      >
                        {JOB_CATEGORY_LABELS[category]}
                      </span>
                    ))}
                  </div>
                ) : (
                  "-"
                )}
              </td>
            </tr>
          ))}
          {deals.length === 0 && (
            <tr>
              <td colSpan={DEAL_SORTABLE_COLUMNS.length + 1} className="px-4 py-8 text-center text-neutral-600">
                該当する商談はありません。
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
