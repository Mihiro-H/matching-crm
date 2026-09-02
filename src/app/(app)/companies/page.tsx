import Link from "next/link";
import { getCompanies } from "@/lib/companies/get-companies";
import {
  COMPANY_SORTABLE_COLUMNS,
  nextSortDirection,
  parseCompaniesListParams,
  type CompanySortColumn,
} from "@/lib/companies/list-params";
import { COMPANY_STATUS_META } from "@/lib/status-badges";
import { StatusBadge } from "@/components/ui/status-badge";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import type { CompanyStatus } from "@/lib/supabase/database.types";

const COLUMN_LABELS: Record<CompanySortColumn, string> = {
  name: "企業名",
  industry: "業種",
  status: "ステータス",
  latest_project: "直近の案件",
  assignee: "担当者",
};

const STATUS_FILTER_CHIPS: { label: string; value: CompanyStatus | null }[] = [
  { label: "すべて", value: null },
  { label: COMPANY_STATUS_META.negotiating.label, value: "negotiating" },
  { label: COMPANY_STATUS_META.active.label, value: "active" },
  { label: COMPANY_STATUS_META.paused.label, value: "paused" },
  { label: COMPANY_STATUS_META.cold.label, value: "cold" },
];

export default async function CompaniesPage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string; dir?: string; status?: string }>;
}) {
  if (!isSupabaseConfigured()) {
    return <SupabaseNotConfiguredNotice />;
  }

  const resolvedParams = await searchParams;
  const params = parseCompaniesListParams(resolvedParams);
  const { companies, error } = await getCompanies(params);

  function hrefFor(overrides: { sort?: CompanySortColumn; status?: CompanyStatus | null }) {
    const next = new URLSearchParams();
    next.set("sort", overrides.sort ?? params.sortBy);
    next.set(
      "dir",
      overrides.sort ? nextSortDirection(params, overrides.sort) : params.sortDir
    );
    const status = "status" in overrides ? overrides.status : params.statusFilter;
    if (status) next.set("status", status);
    return `/companies?${next.toString()}`;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        {STATUS_FILTER_CHIPS.map((chip) => {
          const isActive = params.statusFilter === chip.value;
          return (
            <Link
              key={chip.label}
              href={hrefFor({ status: chip.value })}
              className={`rounded-full px-3 py-1 text-sm ${
                isActive
                  ? "bg-primary-500 text-neutral-0"
                  : "border border-neutral-200 text-neutral-600 hover:bg-page-bg"
              }`}
            >
              {chip.label}
            </Link>
          );
        })}
      </div>

      {error && (
        <div className="rounded-lg border border-danger-bg bg-danger-bg p-4 text-sm text-danger-text">
          企業一覧の取得に失敗しました: {error}
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-neutral-0">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-neutral-100">
              {COMPANY_SORTABLE_COLUMNS.map((column) => (
                <th key={column} className="px-4 py-3 font-medium text-neutral-600">
                  <Link href={hrefFor({ sort: column })} className="hover:text-primary-600">
                    {COLUMN_LABELS[column]}
                    {params.sortBy === column && (params.sortDir === "asc" ? " ▲" : " ▼")}
                  </Link>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {companies.map((company) => (
              <tr key={company.id} className="border-b border-neutral-100 last:border-0">
                <td className="px-4 py-3">
                  <Link href={`/companies/${company.id}`} className="text-primary-600 hover:underline">
                    {company.name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-neutral-600">{company.industry ?? "-"}</td>
                <td className="px-4 py-3">
                  <StatusBadge meta={COMPANY_STATUS_META[company.status as CompanyStatus]} />
                </td>
                <td className="px-4 py-3 text-neutral-600">{company.latestProjectTitle ?? "-"}</td>
                <td className="px-4 py-3 text-neutral-600">{company.assigneeName ?? "-"}</td>
              </tr>
            ))}
            {companies.length === 0 && !error && (
              <tr>
                <td colSpan={COMPANY_SORTABLE_COLUMNS.length} className="px-4 py-8 text-center text-neutral-600">
                  企業が登録されていません。
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SupabaseNotConfiguredNotice() {
  return (
    <div className="rounded-lg border border-neutral-200 bg-neutral-0 p-8">
      <h2 className="text-lg text-neutral-900">Supabase未接続です</h2>
      <p className="mt-2 text-sm text-neutral-600">
        Supabaseの接続情報を .env に設定すると、企業一覧が表示されます。
      </p>
    </div>
  );
}
