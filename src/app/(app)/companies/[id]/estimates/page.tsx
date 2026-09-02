import { getCompanyEstimates } from "@/lib/companies/get-company-estimates";
import { CONTRACT_STATUS_META } from "@/lib/status-badges";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatCurrencyJPY } from "@/lib/format";

const DOCUMENT_TYPE_LABELS = { estimate: "見積書", order: "発注書" } as const;

export default async function CompanyEstimatesTab({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { estimates, error } = await getCompanyEstimates(id);

  if (error) {
    return <p className="text-sm text-danger-text">見積・契約の取得に失敗しました: {error}</p>;
  }

  if (estimates.length === 0) {
    return <p className="text-sm text-neutral-600">この企業に紐づく見積・契約はまだありません。</p>;
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-neutral-0">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-neutral-100 text-neutral-600">
            <th className="px-4 py-3 font-medium">案件名</th>
            <th className="px-4 py-3 font-medium">種別</th>
            <th className="px-4 py-3 font-medium">金額</th>
            <th className="px-4 py-3 font-medium">締結ステータス</th>
          </tr>
        </thead>
        <tbody>
          {estimates.map((estimate) => (
            <tr key={estimate.id} className="border-b border-neutral-100 last:border-0">
              <td className="px-4 py-3 text-neutral-900">{estimate.projectTitle}</td>
              <td className="px-4 py-3 text-neutral-600">{DOCUMENT_TYPE_LABELS[estimate.documentType]}</td>
              <td className="px-4 py-3 text-neutral-600">{formatCurrencyJPY(estimate.amount)}</td>
              <td className="px-4 py-3">
                <StatusBadge meta={CONTRACT_STATUS_META[estimate.contractStatus]} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
