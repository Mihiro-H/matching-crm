"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateCompany } from "@/lib/companies/actions";
import { formatDateJa } from "@/lib/format";
import type { Company } from "@/lib/companies/get-company";

/** 企業詳細ヘッダー: 基本項目の表示+編集(SCREEN_SPEC.md 3章)。 */
export function CompanyInfoSection({ company, canEdit }: { company: Company; canEdit: boolean }) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState(company.name);
  const [industry, setIndustry] = useState(company.industry ?? "");
  const [firstContactDate, setFirstContactDate] = useState(company.first_contact_date ?? "");
  const [platformAccountId, setPlatformAccountId] = useState(company.platform_account_id ?? "");

  function handleCancel() {
    setName(company.name);
    setIndustry(company.industry ?? "");
    setFirstContactDate(company.first_contact_date ?? "");
    setPlatformAccountId(company.platform_account_id ?? "");
    setError(null);
    setIsEditing(false);
  }

  async function handleSave() {
    setError(null);
    setIsSubmitting(true);
    const result = await updateCompany(company.id, {
      name,
      industry: industry || null,
      firstContactDate: firstContactDate || null,
      platformAccountId: platformAccountId || null,
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
          <h2 className="text-lg text-neutral-900">{company.name}</h2>
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
        <dl className="mt-4 grid grid-cols-3 gap-4 text-sm">
          <div>
            <dt className="text-xs text-neutral-600">業種</dt>
            <dd className="text-neutral-900">{company.industry ?? "-"}</dd>
          </div>
          <div>
            <dt className="text-xs text-neutral-600">初回接触日</dt>
            <dd className="text-neutral-900">
              {company.first_contact_date ? formatDateJa(company.first_contact_date) : "-"}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-neutral-600">プラットフォームアカウントID</dt>
            <dd className="text-neutral-900">{company.platform_account_id ?? "-"}</dd>
          </div>
        </dl>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-neutral-200 bg-neutral-0 p-6">
      {error && <p className="mb-3 text-sm text-danger-text">{error}</p>}
      <div className="grid grid-cols-2 gap-4">
        <label className="flex flex-col gap-1">
          <span className="text-xs text-neutral-600">企業名</span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="rounded-md border border-neutral-200 bg-neutral-0 px-3 py-2 text-sm text-neutral-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-neutral-600">業種</span>
          <input
            type="text"
            value={industry}
            onChange={(e) => setIndustry(e.target.value)}
            className="rounded-md border border-neutral-200 bg-neutral-0 px-3 py-2 text-sm text-neutral-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-neutral-600">初回接触日</span>
          <input
            type="date"
            value={firstContactDate}
            onChange={(e) => setFirstContactDate(e.target.value)}
            className="rounded-md border border-neutral-200 bg-neutral-0 px-3 py-2 text-sm text-neutral-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-neutral-600">プラットフォームアカウントID</span>
          <input
            type="text"
            value={platformAccountId}
            onChange={(e) => setPlatformAccountId(e.target.value)}
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
