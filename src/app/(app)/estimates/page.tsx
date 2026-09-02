import Link from "next/link";
import { getEstimates } from "@/lib/estimates/get-estimates";
import { CONTRACT_STATUS_META } from "@/lib/status-badges";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatCurrencyJPY } from "@/lib/format";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { requirePageAccess } from "@/lib/auth/page-access";

const DOCUMENT_TYPE_LABELS = { estimate: "見積書", order: "発注書" } as const;

export default async function EstimatesPage() {
  if (!isSupabaseConfigured()) {
    return <SupabaseNotConfiguredNotice />;
  }

  const { canEdit } = await requirePageAccess("estimates");
  const { estimates, error } = await getEstimates();

  return (
    <div className="flex flex-col gap-4">
      {canEdit && (
        <div className="flex justify-end">
          <Link
            href="/estimates/new"
            className="rounded-md bg-primary-500 px-4 py-2 text-sm text-neutral-0"
          >
            +見積・発注を作成
          </Link>
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-danger-bg bg-danger-bg p-4 text-sm text-danger-text">
          一覧の取得に失敗しました: {error}
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-neutral-0">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-neutral-100 text-neutral-600">
              <th className="px-4 py-3 font-medium">企業名</th>
              <th className="px-4 py-3 font-medium">案件名</th>
              <th className="px-4 py-3 font-medium">種別</th>
              <th className="px-4 py-3 font-medium">金額</th>
              <th className="px-4 py-3 font-medium">締結ステータス</th>
            </tr>
          </thead>
          <tbody>
            {estimates.map((estimate) => (
              <tr key={estimate.id} className="border-b border-neutral-100 last:border-0">
                <td className="px-4 py-3 text-neutral-600">{estimate.companyName}</td>
                <td className="px-4 py-3 text-neutral-900">{estimate.projectTitle}</td>
                <td className="px-4 py-3 text-neutral-600">{DOCUMENT_TYPE_LABELS[estimate.documentType]}</td>
                <td className="px-4 py-3 text-neutral-600">{formatCurrencyJPY(estimate.amount)}</td>
                <td className="px-4 py-3">
                  <StatusBadge meta={CONTRACT_STATUS_META[estimate.contractStatus]} />
                </td>
              </tr>
            ))}
            {estimates.length === 0 && !error && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-neutral-600">
                  見積・発注はまだありません。
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
        Supabaseの接続情報を .env に設定すると、一覧が表示されます。
      </p>
    </div>
  );
}
