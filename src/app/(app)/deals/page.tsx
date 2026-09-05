import Link from "next/link";
import { getDeals } from "@/lib/deals/get-deals";
import { parseDealsListParams } from "@/lib/deals/list-params";
import { DealsTable } from "@/components/deals/deals-table";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { requirePageAccess } from "@/lib/auth/page-access";
import type { DealStatus } from "@/lib/supabase/database.types";

// SCREEN_SPEC.md「商談管理」: ステータスフィルターのチップ(すべて/未対応/対応中/商談中/保留/見積提出済)
const STATUS_FILTER_CHIPS: { label: string; value: DealStatus | null }[] = [
  { label: "すべて", value: null },
  { label: "未対応", value: "new" },
  { label: "対応中", value: "in_progress" },
  { label: "商談中", value: "negotiating" },
  { label: "保留", value: "on_hold" },
  { label: "見積提出済", value: "estimate_submitted" },
];

export default async function DealsPage({
  searchParams,
}: {
  searchParams: Promise<{
    sort?: string;
    dir?: string;
    status?: string;
    companyName?: string;
    name?: string;
    assigneeId?: string;
    assigneeName?: string;
    page?: string;
  }>;
}) {
  if (!isSupabaseConfigured()) {
    return <SupabaseNotConfiguredNotice />;
  }

  const { canEdit } = await requirePageAccess("deals");

  const resolvedParams = await searchParams;
  const params = parseDealsListParams(resolvedParams);
  const { deals, totalCount, error } = await getDeals(params);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {STATUS_FILTER_CHIPS.map((chip) => {
            const isActive = params.statusFilter === chip.value;
            const next = new URLSearchParams();
            next.set("sort", params.sortBy);
            next.set("dir", params.sortDir);
            if (chip.value) next.set("status", chip.value);
            if (params.companyNameFilter) next.set("companyName", params.companyNameFilter);
            if (params.nameFilter) next.set("name", params.nameFilter);
            if (params.assigneeFilter) {
              next.set("assigneeId", params.assigneeFilter.id);
              next.set("assigneeName", params.assigneeFilter.name);
            }
            const href = `/deals?${next.toString()}`;
            return (
              <Link
                key={chip.label}
                href={href}
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
          <Link href="/deals/new" className="rounded-md bg-primary-500 px-4 py-2 text-sm text-neutral-0">
            +新規作成
          </Link>
        )}
      </div>

      {error && (
        <div className="rounded-lg border border-danger-bg bg-danger-bg p-4 text-sm text-danger-text">
          一覧の取得に失敗しました: {error}
        </div>
      )}

      {!error && <DealsTable deals={deals} params={params} totalCount={totalCount} />}
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
