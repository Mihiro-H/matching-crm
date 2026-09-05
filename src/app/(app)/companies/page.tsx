import Link from "next/link";
import { getCompanies } from "@/lib/companies/get-companies";
import {
  COMPANY_SORTABLE_COLUMNS,
  nextSortDirection,
  parseCompaniesListParams,
  type CompanySortColumn,
} from "@/lib/companies/list-params";
import { SortFilterHeader } from "@/components/ui/sort-filter-header";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { requirePageAccess } from "@/lib/auth/page-access";

const COLUMN_LABELS: Record<CompanySortColumn, string> = {
  name: "企業名",
  industry: "業種",
  latest_project: "直近の案件",
};

export default async function CompaniesPage({
  searchParams,
}: {
  searchParams: Promise<{
    sort?: string;
    dir?: string;
    name?: string;
  }>;
}) {
  if (!isSupabaseConfigured()) {
    return <SupabaseNotConfiguredNotice />;
  }

  const { canEdit } = await requirePageAccess("companies");

  const resolvedParams = await searchParams;
  const params = parseCompaniesListParams(resolvedParams);
  const { companies, error } = await getCompanies(params);

  function hrefFor(overrides: { sort?: CompanySortColumn; name?: string | null }) {
    const next = new URLSearchParams();
    next.set("sort", overrides.sort ?? params.sortBy);
    next.set("dir", overrides.sort ? nextSortDirection(params, overrides.sort) : params.sortDir);

    const name = "name" in overrides ? overrides.name : params.nameFilter;
    if (name) next.set("name", name);

    return `/companies?${next.toString()}`;
  }

  // SortFilterHeaderはクライアントコンポーネントのため、関数(hrefFor)ではなく
  // 素のデータだけを渡す("use server"以外の関数はクライアントへ渡せないため)。
  const currentQuery: Record<string, string> = { sort: params.sortBy, dir: params.sortDir };
  if (params.nameFilter) currentQuery.name = params.nameFilter;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        {canEdit && (
          <Link href="/companies/new" className="rounded-md bg-primary-500 px-4 py-2 text-sm text-neutral-0">
            +新規作成
          </Link>
        )}
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
                <SortFilterHeader
                  key={column}
                  label={COLUMN_LABELS[column]}
                  sortHref={hrefFor({ sort: column })}
                  isSorted={params.sortBy === column}
                  sortDir={params.sortDir}
                  basePath="/companies"
                  currentQuery={currentQuery}
                  filter={
                    column === "name"
                      ? { type: "text", value: params.nameFilter, placeholder: "企業名で検索", paramName: "name" }
                      : undefined
                  }
                />
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
                <td className="px-4 py-3 text-neutral-600">{company.latestProjectTitle ?? "-"}</td>
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
