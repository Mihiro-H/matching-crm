"use client";

import { useState } from "react";
import { SearchSelectModal, type SearchResultItem } from "@/components/ui/search-select-modal";
import { CreateCompanyInlineForm } from "@/components/companies/create-company-inline-form";
import { createPersonInline, searchCompanies } from "@/lib/search-select/actions";

/**
 * SCREEN_SPEC.md「商談管理」「案件管理」作成画面の企業担当者選択モーダルからの
 * インライン新規登録。担当者名(検索文字列が初期値)を入力し、企業は既存企業を
 * 選ぶか、その場でCreateCompanyInlineForm経由で新規登録して紐付けられる
 * (企業は任意。未選択のままでも登録できる)。「登録して選択」でpeopleに
 * レコードを作成してそのまま選択状態にする。
 */
export function CreatePersonInlineForm({
  initialName,
  onCreated,
}: {
  initialName: string;
  onCreated: (item: SearchResultItem) => void;
}) {
  const [name, setName] = useState(initialName);
  const [company, setCompany] = useState<SearchResultItem | null>(null);
  const [showCompanyModal, setShowCompanyModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    // このフォームはSearchSelectModal(ポータル経由でdocument.bodyへレンダーされる)の
    // createNew.render()経由で、呼び出し元の<form>の中から使われることがある。
    // ポータルはDOM上では祖先の<form>の外側に出るが、Reactのsubmitイベントは
    // Reactツリー上の祖先(呼び出し元の<form>)へも伝播してしまい、その
    // onSubmitまで誤って発火する(実際に発生した不具合)。stopPropagationで止める。
    e.stopPropagation();
    if (!name.trim()) {
      setError("担当者名を入力してください");
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      const created = await createPersonInline(name.trim(), company?.id ?? null);
      onCreated(created);
    } catch (err) {
      setError(err instanceof Error ? err.message : "担当者の登録に失敗しました");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 p-2">
      {error && <p className="text-sm text-danger-text">{error}</p>}
      <label className="flex flex-col gap-1">
        <span className="text-xs text-neutral-600">担当者名</span>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="rounded-md border border-neutral-200 bg-neutral-0 px-3 py-2 text-sm text-neutral-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
        />
      </label>
      <div className="flex flex-col gap-1">
        <span className="text-xs text-neutral-600">企業(任意)</span>
        <div className="flex items-center gap-2">
          <span className="text-sm text-neutral-900">{company ? company.label : "未選択"}</span>
          <button
            type="button"
            onClick={() => setShowCompanyModal(true)}
            className="text-xs text-primary-600 hover:underline"
          >
            企業を選択
          </button>
        </div>
      </div>
      <button
        type="submit"
        disabled={isSubmitting}
        className="self-start rounded-md bg-primary-500 px-4 py-2 text-sm text-neutral-0 disabled:opacity-40"
      >
        登録して選択
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
          if (item) setCompany(item);
        }}
        createNew={{
          label: (query) => `"${query}"を新規登録`,
          render: (query, onCompanyCreated) => (
            <CreateCompanyInlineForm initialName={query} onCreated={onCompanyCreated} />
          ),
        }}
      />
    </form>
  );
}
