"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateContactDetails } from "@/lib/contacts/actions";
import { CONTACT_STATUS_META } from "@/lib/status-badges";
import { StatusBadge } from "@/components/ui/status-badge";
import { JOB_CATEGORIES, JOB_CATEGORY_LABELS } from "@/lib/job-categories";
import { formatDateJa } from "@/lib/format";
import type { ContactDetail } from "@/lib/contacts/get-contact";
import type { JobCategory } from "@/lib/supabase/database.types";

const SOURCE_LABELS: Record<string, string> = { form: "フォーム", referral: "紹介", other: "その他" };

/** 商談・担当者詳細ヘッダー: 基本項目の表示+編集(SCREEN_SPEC.md 2章)。 */
export function ContactInfoSection({ contact, canEdit }: { contact: ContactDetail; canEdit: boolean }) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState(contact.name);
  const [email, setEmail] = useState(contact.email ?? "");
  const [phone, setPhone] = useState(contact.phone ?? "");
  const [jobCategories, setJobCategories] = useState<JobCategory[]>(contact.job_categories);
  const [inquiryBody, setInquiryBody] = useState(contact.inquiry_body ?? "");

  function toggleJobCategory(category: JobCategory) {
    setJobCategories((prev) =>
      prev.includes(category) ? prev.filter((c) => c !== category) : [...prev, category]
    );
  }

  function handleCancel() {
    setName(contact.name);
    setEmail(contact.email ?? "");
    setPhone(contact.phone ?? "");
    setJobCategories(contact.job_categories);
    setInquiryBody(contact.inquiry_body ?? "");
    setError(null);
    setIsEditing(false);
  }

  async function handleSave() {
    setError(null);
    setIsSubmitting(true);
    const result = await updateContactDetails(contact.id, {
      name,
      email: email || null,
      phone: phone || null,
      jobCategories,
      inquiryBody: inquiryBody || null,
    });
    setIsSubmitting(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    setIsEditing(false);
    router.refresh();
  }

  if (!isEditing) {
    return (
      <div className="rounded-lg border border-neutral-200 bg-neutral-0 p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-neutral-600">
              {contact.companyName ?? contact.company_name_raw ?? "企業名未登録"}
            </p>
            <h2 className="mt-1 text-lg text-neutral-900">{contact.name}</h2>
          </div>
          <div className="flex items-center gap-3">
            <StatusBadge meta={CONTACT_STATUS_META[contact.status]} />
            {canEdit && (
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="rounded-md border border-neutral-200 px-3 py-1.5 text-sm text-neutral-600 hover:bg-page-bg"
              >
                編集
              </button>
            )}
          </div>
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
    );
  }

  return (
    <div className="rounded-lg border border-neutral-200 bg-neutral-0 p-6">
      <p className="text-xs text-neutral-600">
        {contact.companyName ?? contact.company_name_raw ?? "企業名未登録"}
      </p>
      {error && <p className="mt-2 text-sm text-danger-text">{error}</p>}

      <div className="mt-3 grid grid-cols-2 gap-4">
        <label className="flex flex-col gap-1">
          <span className="text-xs text-neutral-600">氏名</span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="rounded-md border border-neutral-200 bg-neutral-0 px-3 py-2 text-sm text-neutral-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-neutral-600">メール</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-md border border-neutral-200 bg-neutral-0 px-3 py-2 text-sm text-neutral-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-neutral-600">電話番号</span>
          <input
            type="text"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="rounded-md border border-neutral-200 bg-neutral-0 px-3 py-2 text-sm text-neutral-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
          />
        </label>
        <div className="flex flex-col gap-1">
          <span className="text-xs text-neutral-600">依頼職種</span>
          <div className="flex flex-wrap gap-3 pt-2">
            {JOB_CATEGORIES.map((category) => (
              <label key={category} className="flex items-center gap-1.5 text-sm text-neutral-900">
                <input
                  type="checkbox"
                  checked={jobCategories.includes(category)}
                  onChange={() => toggleJobCategory(category)}
                  className="h-4 w-4 rounded border-neutral-200 text-primary-500 focus:ring-primary-100"
                />
                {JOB_CATEGORY_LABELS[category]}
              </label>
            ))}
          </div>
        </div>
        <label className="col-span-2 flex flex-col gap-1">
          <span className="text-xs text-neutral-600">問い合わせ内容</span>
          <textarea
            value={inquiryBody}
            onChange={(e) => setInquiryBody(e.target.value)}
            rows={4}
            className="rounded-md border border-neutral-200 bg-neutral-0 px-3 py-2 text-sm text-neutral-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
          />
        </label>
      </div>

      <div className="mt-4 flex gap-2">
        <button
          type="button"
          disabled={isSubmitting}
          onClick={handleSave}
          className="rounded-md bg-primary-500 px-4 py-2 text-sm text-neutral-0 disabled:opacity-40"
        >
          保存
        </button>
        <button
          type="button"
          disabled={isSubmitting}
          onClick={handleCancel}
          className="rounded-md border border-neutral-200 px-4 py-2 text-sm text-neutral-600 hover:bg-page-bg disabled:opacity-40"
        >
          キャンセル
        </button>
      </div>
    </div>
  );
}
