import { notFound } from "next/navigation";
import { getContactById } from "@/lib/contacts/get-contact";
import { CONTACT_STATUS_META } from "@/lib/status-badges";
import { StatusBadge } from "@/components/ui/status-badge";
import { JOB_CATEGORY_LABELS } from "@/lib/job-categories";
import { formatDateJa } from "@/lib/format";
import { ContactDetailActions } from "@/components/contacts/contact-detail-actions";
import { requirePageAccess } from "@/lib/auth/page-access";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { SupabaseNotConfiguredNotice } from "@/components/ui/supabase-not-configured-notice";

const SOURCE_LABELS: Record<string, string> = { form: "フォーム", referral: "紹介", other: "その他" };

export default async function ContactDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!isSupabaseConfigured()) {
    return <SupabaseNotConfiguredNotice />;
  }

  const { id } = await params;
  const { canEdit } = await requirePageAccess("contacts");
  const contact = await getContactById(id);
  if (!contact) {
    notFound();
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-lg border border-neutral-200 bg-neutral-0 p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-neutral-600">
              {contact.companyName ?? contact.company_name_raw ?? "企業名未登録"}
            </p>
            <h2 className="mt-1 text-lg text-neutral-900">{contact.name}</h2>
          </div>
          <StatusBadge meta={CONTACT_STATUS_META[contact.status]} />
        </div>

        <dl className="mt-4 grid grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="text-xs text-neutral-600">メール</dt>
            <dd className="text-neutral-900">{contact.email ?? "-"}</dd>
          </div>
          <div>
            <dt className="text-xs text-neutral-600">電話番号</dt>
            <dd className="text-neutral-900">{contact.phone ?? "-"}</dd>
          </div>
          <div>
            <dt className="text-xs text-neutral-600">流入経路</dt>
            <dd className="text-neutral-900">{SOURCE_LABELS[contact.source] ?? contact.source}</dd>
          </div>
          <div>
            <dt className="text-xs text-neutral-600">担当者</dt>
            <dd className="text-neutral-900">{contact.assigneeName ?? "未アサイン"}</dd>
          </div>
          {contact.job_categories.length > 0 && (
            <div className="col-span-2">
              <dt className="text-xs text-neutral-600">依頼職種</dt>
              <dd className="mt-1 flex flex-wrap gap-1">
                {contact.job_categories.map((category) => (
                  <span key={category} className="rounded-sm bg-page-bg px-2 py-0.5 text-xs text-neutral-600">
                    {JOB_CATEGORY_LABELS[category]}
                  </span>
                ))}
              </dd>
            </div>
          )}
          {contact.inquiry_body && (
            <div className="col-span-2">
              <dt className="text-xs text-neutral-600">問い合わせ内容</dt>
              <dd className="mt-1 whitespace-pre-wrap text-neutral-900">{contact.inquiry_body}</dd>
            </div>
          )}
          {contact.status === "lost" && contact.lost_reason && (
            <div className="col-span-2">
              <dt className="text-xs text-neutral-600">失注理由</dt>
              <dd className="mt-1 text-neutral-900">{contact.lost_reason}</dd>
            </div>
          )}
          {contact.started_at && (
            <div>
              <dt className="text-xs text-neutral-600">窓口就任日</dt>
              <dd className="text-neutral-900">{formatDateJa(contact.started_at)}</dd>
            </div>
          )}
        </dl>
      </div>

      <ContactDetailActions contact={contact} canEdit={canEdit} />
    </div>
  );
}
