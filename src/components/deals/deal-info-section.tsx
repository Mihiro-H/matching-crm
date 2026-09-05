"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { updateDealDetails } from "@/lib/deals/actions";
import { DEAL_STATUS_META } from "@/lib/status-badges";
import { StatusBadge } from "@/components/ui/status-badge";
import { JOB_CATEGORIES, JOB_CATEGORY_LABELS } from "@/lib/job-categories";
import { formatDateTimeJa, formatDateJa } from "@/lib/format";
import type { DealDetail } from "@/lib/deals/get-deal";
import type { JobCategory } from "@/lib/supabase/database.types";

const SOURCE_LABELS: Record<string, string> = { form: "フォーム", referral: "紹介", other: "その他" };

/** 商談詳細ヘッダー: 基本項目の表示+編集(SCREEN_SPEC.md「商談管理」)。 */
export function DealInfoSection({ deal, canEdit }: { deal: DealDetail; canEdit: boolean }) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [jobCategories, setJobCategories] = useState<JobCategory[]>(deal.jobCategories);
  const [inquiryBody, setInquiryBody] = useState(deal.inquiryBody ?? "");

  function toggleJobCategory(category: JobCategory) {
    setJobCategories((prev) =>
      prev.includes(category) ? prev.filter((c) => c !== category) : [...prev, category]
    );
  }

  function handleCancel() {
    setJobCategories(deal.jobCategories);
    setInquiryBody(deal.inquiryBody ?? "");
    setError(null);
    setIsEditing(false);
  }

  async function handleSave() {
    setError(null);
    setIsSubmitting(true);
    const result = await updateDealDetails(deal.id, { jobCategories, inquiryBody: inquiryBody || null });
    setIsSubmitting(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    setIsEditing(false);
    router.refresh();
  }

  return (
    <div className="rounded-lg border border-neutral-200 bg-neutral-0 p-6">
      <div className="flex items-start justify-between">
        <div>
          {deal.companyId ? (
            <Link href={`/companies/${deal.companyId}`} className="text-xs text-primary-600 hover:underline">
              {deal.companyName ?? "企業名未登録"}
            </Link>
          ) : (
            <p className="text-xs text-neutral-600">{deal.companyName ?? "企業名未登録"}</p>
          )}
          <h2 className="mt-1 text-lg text-neutral-900">
            <Link href={`/people/${deal.personId}`} className="hover:underline">
              {deal.personName}
            </Link>
          </h2>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge meta={DEAL_STATUS_META[deal.status]} />
          {canEdit && !isEditing && (
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

      {error && <p className="mt-2 text-sm text-danger-text">{error}</p>}

      <dl className="mt-4 grid grid-cols-2 gap-4 text-sm">
        <div>
          <dt className="text-xs text-neutral-600">メール</dt>
          <dd className="text-neutral-900">{deal.personEmail ?? "-"}</dd>
        </div>
        <div>
          <dt className="text-xs text-neutral-600">電話番号</dt>
          <dd className="text-neutral-900">{deal.personPhone ?? "-"}</dd>
        </div>
        <div>
          <dt className="text-xs text-neutral-600">初回問合せ日</dt>
          <dd className="text-neutral-900">{formatDateJa(deal.createdAt)}</dd>
        </div>
        <div>
          <dt className="text-xs text-neutral-600">流入経路</dt>
          <dd className="text-neutral-900">{SOURCE_LABELS[deal.source] ?? deal.source}</dd>
        </div>
        <div>
          <dt className="text-xs text-neutral-600">主担当</dt>
          <dd className="text-neutral-900">{deal.assigneeName ?? "未アサイン"}</dd>
        </div>
        <div>
          <dt className="text-xs text-neutral-600">商談更新日</dt>
          <dd className="text-neutral-900">{formatDateTimeJa(deal.updatedAt)}</dd>
        </div>

        <div className="col-span-2">
          <dt className="text-xs text-neutral-600">依頼職種</dt>
          {isEditing ? (
            <div className="mt-1 flex flex-wrap gap-3">
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
          ) : (
            <dd className="mt-1 flex flex-wrap gap-1">
              {deal.jobCategories.length > 0
                ? deal.jobCategories.map((category) => (
                    <span key={category} className="rounded-sm bg-page-bg px-2 py-0.5 text-xs text-neutral-600">
                      {JOB_CATEGORY_LABELS[category]}
                    </span>
                  ))
                : "-"}
            </dd>
          )}
        </div>

        <div className="col-span-2">
          <dt className="text-xs text-neutral-600">問い合わせ内容</dt>
          {isEditing ? (
            <textarea
              value={inquiryBody}
              onChange={(e) => setInquiryBody(e.target.value)}
              rows={4}
              className="mt-1 w-full rounded-md border border-neutral-200 bg-neutral-0 px-3 py-2 text-sm text-neutral-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
            />
          ) : (
            <dd className="mt-1 whitespace-pre-wrap text-neutral-900">{deal.inquiryBody ?? "-"}</dd>
          )}
        </div>

        {deal.status === "won" && deal.wonReason && (
          <div className="col-span-2">
            <dt className="text-xs text-neutral-600">受注理由</dt>
            <dd className="mt-1 text-neutral-900">{deal.wonReason}</dd>
          </div>
        )}
        {deal.status === "lost" && deal.lostReason && (
          <div className="col-span-2">
            <dt className="text-xs text-neutral-600">失注理由</dt>
            <dd className="mt-1 text-neutral-900">{deal.lostReason}</dd>
          </div>
        )}
      </dl>

      {isEditing && (
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
      )}
    </div>
  );
}
