import { notFound } from "next/navigation";
import { getProjectInvoices } from "@/lib/projects/get-project-invoices";
import { resolveProjectId } from "@/lib/projects/resolve-project-id";
import { PAYMENT_STATUS_META } from "@/lib/status-badges";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatCurrencyJPY, formatDateJa } from "@/lib/format";

export default async function ProjectInvoicesTab({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: numberParam } = await params;
  const id = await resolveProjectId(numberParam);
  if (!id) notFound();

  const { invoices, error } = await getProjectInvoices(id);

  if (error) {
    return <p className="text-sm text-danger-text">請求の取得に失敗しました: {error}</p>;
  }

  if (invoices.length === 0) {
    return <p className="text-sm text-neutral-600">この案件の請求はまだありません。</p>;
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-neutral-0">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-neutral-100 text-neutral-600">
            <th className="px-4 py-3 font-medium">金額</th>
            <th className="px-4 py-3 font-medium">請求期日</th>
            <th className="px-4 py-3 font-medium">入金状況</th>
          </tr>
        </thead>
        <tbody>
          {invoices.map((invoice) => (
            <tr key={invoice.id} className="border-b border-neutral-100 last:border-0">
              <td className="px-4 py-3 text-neutral-900">{formatCurrencyJPY(invoice.amount)}</td>
              <td className="px-4 py-3 text-neutral-600">
                {invoice.due_date ? formatDateJa(invoice.due_date) : "-"}
              </td>
              <td className="px-4 py-3">
                <StatusBadge meta={PAYMENT_STATUS_META[invoice.payment_status]} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
