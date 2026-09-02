"use client";

import { useState } from "react";
import { createCompany, type SearchResultItem } from "@/lib/search-select/actions";

/**
 * SCREEN_SPEC.md「企業選択モーダルの新規作成フロー」:
 * 企業名(検索文字列が初期値)・業種(任意)を入力し、「登録して選択」で
 * companiesにレコードを作成してそのまま選択状態にする。
 */
export function CreateCompanyInlineForm({
  initialName,
  onCreated,
}: {
  initialName: string;
  onCreated: (item: SearchResultItem) => void;
}) {
  const [name, setName] = useState(initialName);
  const [industry, setIndustry] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError("企業名を入力してください");
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      const created = await createCompany(name.trim(), industry.trim() || null);
      onCreated(created);
    } catch (err) {
      setError(err instanceof Error ? err.message : "企業の登録に失敗しました");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 p-2">
      {error && <p className="text-sm text-danger-text">{error}</p>}
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
        <span className="text-xs text-neutral-600">業種(任意)</span>
        <input
          type="text"
          value={industry}
          onChange={(e) => setIndustry(e.target.value)}
          className="rounded-md border border-neutral-200 bg-neutral-0 px-3 py-2 text-sm text-neutral-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
        />
      </label>
      <button
        type="submit"
        disabled={isSubmitting}
        className="self-start rounded-md bg-primary-500 px-4 py-2 text-sm text-neutral-0 disabled:opacity-40"
      >
        登録して選択
      </button>
    </form>
  );
}
