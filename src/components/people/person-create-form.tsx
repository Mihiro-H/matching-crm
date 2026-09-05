"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SearchSelectModal, type SearchResultItem } from "@/components/ui/search-select-modal";
import { CreateCompanyInlineForm } from "@/components/companies/create-company-inline-form";
import { usePageBreadcrumbs } from "@/components/layout/page-header-context";
import { searchCompanies } from "@/lib/search-select/actions";
import { createPerson } from "@/lib/people/actions";

/** 担当者一覧「+新規作成」(SCREEN_SPEC.md「担当者一覧」)。 */
export function PersonCreateForm() {
  const router = useRouter();
  usePageBreadcrumbs([{ label: "担当者一覧", href: "/people" }, { label: "新規作成" }]);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [company, setCompany] = useState<SearchResultItem | null>(null);
  const [showCompanyModal, setShowCompanyModal] = useState(false);
  const [companyNameRaw, setCompanyNameRaw] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError("担当者名を入力してください。");
      return;
    }
    setIsSubmitting(true);
    const result = await createPerson({
      name,
      email: email || null,
      phone: phone || null,
      companyId: company?.id ?? null,
      companyNameRaw: companyNameRaw || null,
    });
    setIsSubmitting(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    router.push(`/people/${result.id}`);
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border border-neutral-200 bg-neutral-0 p-6">
      {error && <p className="mb-3 text-sm text-danger-text">{error}</p>}

      <div className="flex flex-col gap-4">
        <div>
          <p className="text-xs text-neutral-600">
            企業(分かっていれば選択、未確定なら下の企業名(仮)欄に入力してください)
          </p>
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

        <div className="grid grid-cols-2 gap-4">
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
            <span className="text-xs text-neutral-600">企業名(仮、企業未選択の場合)</span>
            <input
              type="text"
              value={companyNameRaw}
              disabled={company !== null}
              onChange={(e) => setCompanyNameRaw(e.target.value)}
              className="rounded-md border border-neutral-200 bg-neutral-0 px-3 py-2 text-sm text-neutral-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100 disabled:bg-page-bg disabled:text-neutral-400"
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
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="mt-6 rounded-md bg-primary-500 px-4 py-2 text-sm text-neutral-0 disabled:opacity-40"
      >
        登録
      </button>

      <SearchSelectModal
        isOpen={showCompanyModal}
        onClose={() => setShowCompanyModal(false)}
        title="企業を選択"
        placeholder="企業名で検索"
        mode="single"
        search={searchCompanies}
        onConfirm={(items) => {
          const [item] = items;
          if (item) {
            setCompany(item);
            setCompanyNameRaw("");
          }
        }}
        createNew={{
          label: (query) => `"${query}"を新規登録`,
          render: (query, onCreated) => <CreateCompanyInlineForm initialName={query} onCreated={onCreated} />,
        }}
      />
    </form>
  );
}
