import Link from "next/link";
import { getInvoices } from "@/lib/invoices/get-invoices";
import { getMisocaConnectionStatus } from "@/lib/misoca/get-connection-status";
import { PAYMENT_STATUS_META } from "@/lib/status-badges";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatCurrencyJPY, formatDateJa } from "@/lib/format";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { requirePageAccess } from "@/lib/auth/page-access";

export default async function InvoicesPage() {
  if (!isSupabaseConfigured()) {
    return <SupabaseNotConfiguredNotice />;
  }

  const { canEdit } = await requirePageAccess("invoices");

  const { invoices, error } = await getInvoices();
  const misocaStatus = await getMisocaConnectionStatus();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <span
          className={`rounded-full px-3 py-1 text-xs ${
            misocaStatus.connected ? "bg-success-bg text-success-text" : "bg-neutral-100 text-neutral-600"
          }`}
        >
          {misocaStatus.connected ? "Misoca連携中" : "Misoca未連携"}
        </span>
        {canEdit && (
          <Link
            href="/invoices/new"
            className="rounded-md bg-primary-500 px-4 py-2 text-sm text-neutral-0"
          >
            +請求書を作成
          </Link>
        )}
      </div>

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
              <th className="px-4 py-3 font-medium">金額</th>
              <th className="px-4 py-3 font-medium">請求日</th>
              <th className="px-4 py-3 font-medium">入金状況</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((invoice) => (
              <tr key={invoice.id} className="border-b border-neutral-100 last:border-0">
                <td className="px-4 py-3 text-neutral-600">{invoice.companyName}</td>
                <td className="px-4 py-3">
                  <Link href={`/invoices/${invoice.id}`} className="text-primary-600 hover:underline">
                    {invoice.projectTitle}
                  </Link>
                </td>
                <td className="px-4 py-3 text-neutral-600">{formatCurrencyJPY(invoice.amount)}</td>
                <td className="px-4 py-3 text-neutral-600">
                  {invoice.issuedDate ? formatDateJa(invoice.issuedDate) : "-"}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge meta={PAYMENT_STATUS_META[invoice.paymentStatus]} />
                </td>
              </tr>
            ))}
            {invoices.length === 0 && !error && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-neutral-600">
                  請求はまだありません。
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
