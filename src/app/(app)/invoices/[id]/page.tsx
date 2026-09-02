import { notFound } from "next/navigation";
import { getInvoiceById, getInvoicePaymentStatusLog } from "@/lib/invoices/get-invoice";
import { PAYMENT_STATUS_META } from "@/lib/status-badges";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatCurrencyJPY, formatDateJa } from "@/lib/format";
import { buildFreeeInvoiceUrl } from "@/lib/freee";
import { requirePageAccess } from "@/lib/auth/page-access";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { SupabaseNotConfiguredNotice } from "@/components/ui/supabase-not-configured-notice";

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!isSupabaseConfigured()) {
    return <SupabaseNotConfiguredNotice />;
  }

  const { id } = await params;
  await requirePageAccess("invoices");
  const invoice = await getInvoiceById(id);
  if (!invoice) {
    notFound();
  }

  const log = await getInvoicePaymentStatusLog(id);
  const freeeUrl = buildFreeeInvoiceUrl(invoice.freee_invoice_id);

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-lg border border-neutral-200 bg-neutral-0 p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-neutral-600">{invoice.companyName}</p>
            <h2 className="mt-1 text-lg text-neutral-900">{invoice.projectTitle}</h2>
          </div>
          <StatusBadge meta={PAYMENT_STATUS_META[invoice.payment_status]} />
        </div>

        <dl className="mt-4 grid grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="text-xs text-neutral-600">金額</dt>
            <dd className="text-neutral-900">{formatCurrencyJPY(invoice.amount)}</dd>
          </div>
          <div>
            <dt className="text-xs text-neutral-600">請求日</dt>
            <dd className="text-neutral-900">{invoice.issued_date ? formatDateJa(invoice.issued_date) : "-"}</dd>
          </div>
          <div>
            <dt className="text-xs text-neutral-600">支払期日</dt>
            <dd className="text-neutral-900">{invoice.due_date ? formatDateJa(invoice.due_date) : "-"}</dd>
          </div>
        </dl>

        <p className="mt-4 text-xs text-neutral-600">
          金額・入金状況の修正はfreee側で行ってください。Orbit上では編集できません。
        </p>

        {freeeUrl ? (
          <a href={freeeUrl} target="_blank" rel="noreferrer" className="mt-2 inline-block text-sm text-primary-600 hover:underline">
            freeeで請求書を見る
          </a>
        ) : (
          <p className="mt-2 text-xs text-neutral-400">freee未連携のため請求書リンクはまだありません。</p>
        )}
      </div>

      <div className="rounded-lg border border-neutral-200 bg-neutral-0 p-6">
        <h3 className="text-md text-neutral-900">入金状況の変更履歴</h3>
        {log.length === 0 ? (
          <p className="mt-2 text-sm text-neutral-600">変更履歴はまだありません。</p>
        ) : (
          <ul className="mt-3 flex flex-col gap-2">
            {log.map((entry, i) => (
              <li key={i} className="flex items-center justify-between text-sm">
                <span className="text-neutral-900">{entry.status}</span>
                <span className="text-xs text-neutral-600">{formatDateJa(entry.occurredAt)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
