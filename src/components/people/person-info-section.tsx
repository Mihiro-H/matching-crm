"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SearchSelectModal, type SearchResultItem } from "@/components/ui/search-select-modal";
import { CreateCompanyInlineForm } from "@/components/companies/create-company-inline-form";
import { searchCompanies } from "@/lib/search-select/actions";
import { updatePerson } from "@/lib/people/actions";
import type { PersonDetail } from "@/lib/people/get-person";

/** 担当者詳細ヘッダー: 基本項目の表示+編集(SCREEN_SPEC.md「担当者一覧」)。 */
export function PersonInfoSection({ person, canEdit }: { person: PersonDetail; canEdit: boolean }) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState(person.name);
  const [email, setEmail] = useState(person.email ?? "");
  const [phone, setPhone] = useState(person.phone ?? "");
  const [company, setCompany] = useState<SearchResultItem | null>(
    person.companyId ? { id: person.companyId, label: person.companyName ?? "", sublabel: null } : null
  );
  const [showCompanyModal, setShowCompanyModal] = useState(false);

  function handleCancel() {
    setName(person.name);
    setEmail(person.email ?? "");
    setPhone(person.phone ?? "");
    setCompany(person.companyId ? { id: person.companyId, label: person.companyName ?? "", sublabel: null } : null);
    setError(null);
    setIsEditing(false);
  }

  async function handleSave() {
    setError(null);
    setIsSubmitting(true);
    const result = await updatePerson(person.id, {
      name,
      email: email || null,
      phone: phone || null,
      companyId: company?.id ?? null,
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
            <p className="text-xs text-neutral-600">{person.companyName ?? "企業名未登録"}</p>
            <h2 className="mt-1 text-lg text-neutral-900">{person.name}</h2>
          </div>
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
        <dl className="mt-4 grid grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="text-xs text-neutral-600">メール</dt>
            <dd className="text-neutral-900">{person.email ?? "-"}</dd>
          </div>
          <div>
            <dt className="text-xs text-neutral-600">電話番号</dt>
            <dd className="text-neutral-900">{person.phone ?? "-"}</dd>
          </div>
        </dl>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-neutral-200 bg-neutral-0 p-6">
      {error && <p className="mb-3 text-sm text-danger-text">{error}</p>}

      <div>
        <p className="text-xs text-neutral-600">企業</p>
        <div className="mt-1 flex items-center gap-2">
          <span className="text-sm text-neutral-900">{company ? company.label : "未選択"}</span>
          <button
            type="button"
            onClick={() => setShowCompanyModal(true)}
            className="text-xs text-primary-600 hover:underline"
          >
            企業を選択
          </button>
          {company && (
            <button
              type="button"
              onClick={() => setCompany(null)}
              className="text-xs text-neutral-600 hover:underline"
            >
              選択解除
            </button>
          )}
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-4">
        <label className="flex flex-col gap-1">
          <span className="text-xs text-neutral-600">担当者名</span>
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

      <SearchSelectModal
        isOpen={showCompanyModal}
        onClose={() => setShowCompanyModal(false)}
        title="企業を選択"
        placeholder="企業名で検索"
        mode="single"
        search={searchCompanies}
        onConfirm={(items) => {
          const [item] = items;
          if (item) setCompany(item);
        }}
        createNew={{
          label: (query) => `"${query}"を新規登録`,
          render: (query, onCreated) => <CreateCompanyInlineForm initialName={query} onCreated={onCreated} />,
        }}
      />
    </div>
  );
}
