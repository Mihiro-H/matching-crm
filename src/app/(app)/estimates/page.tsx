import Link from "next/link";
import { getEstimates } from "@/lib/estimates/get-estimates";
import { parseEstimatesListParams } from "@/lib/estimates/list-params";
import { EstimatesTable } from "@/components/estimates/estimates-table";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { requirePageAccess } from "@/lib/auth/page-access";
import type { EstimateDocumentType } from "@/lib/supabase/database.types";

// SCREEN_SPEC.md 5章: 種別フィルターのチップ(すべて/見積書/納品書)
const DOCUMENT_TYPE_FILTER_CHIPS: { label: string; value: EstimateDocumentType | null }[] = [
  { label: "すべて", value: null },
  { label: "見積書", value: "estimate" },
  { label: "納品書", value: "delivery_slip" },
];

export default async function EstimatesPage({
  searchParams,
}: {
  searchParams: Promise<{
    sort?: string;
    dir?: string;
    documentType?: string;
    companyName?: string;
    projectTitle?: string;
  }>;
}) {
  if (!isSupabaseConfigured()) {
    return <SupabaseNotConfiguredNotice />;
  }

  const { canEdit } = await requirePageAccess("estimates");

  const resolvedParams = await searchParams;
  const params = parseEstimatesListParams(resolvedParams);
  const { estimates, error } = await getEstimates(params);

  function chipHref(documentType: EstimateDocumentType | null) {
    const next = new URLSearchParams();
    next.set("sort", params.sortBy);
    next.set("dir", params.sortDir);
    if (documentType) next.set("documentType", documentType);
    if (params.companyNameFilter) next.set("companyName", params.companyNameFilter);
    if (params.projectTitleFilter) next.set("projectTitle", params.projectTitleFilter);
    return `/estimates?${next.toString()}`;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex flex-wrap gap-2">
          {DOCUMENT_TYPE_FILTER_CHIPS.map((chip) => {
            const isActive = params.documentTypeFilter === chip.value;
            return (
              <Link
                key={chip.label}
                href={chipHref(chip.value)}
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
        {canEdit && (
          <Link
            href="/estimates/new"
            className="rounded-md bg-primary-500 px-4 py-2 text-sm text-neutral-0"
          >
            +見積・発注を作成
          </Link>
        )}
      </div>

      {error && (
        <div className="rounded-lg border border-danger-bg bg-danger-bg p-4 text-sm text-danger-text">
          一覧の取得に失敗しました: {error}
        </div>
      )}

      {!error && <EstimatesTable estimates={estimates} params={params} />}
    </div>
  );
}

function SupabaseNotConfiguredNotice() {
  return (
    <div className="rounded-lg border border-neutral-200 bg-neutral-0 p-8">
      <h2 className="text-lg text-neutral-900">Supabase未接続です</h2>
      <p className="mt-2 text-sm text-neutral-600">
        Supabaseの接続情報を .env に設定すると、一覧が表示されます。
      </p>
    </div>
  );
}
