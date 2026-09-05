"use client";

import { useState } from "react";
import { createPersonInline, type SearchResultItem } from "@/lib/search-select/actions";

/**
 * SCREEN_SPEC.md「商談管理」作成画面の担当者選択モーダルからのインライン新規登録。
 * 担当者名(検索文字列が初期値)・企業名(仮、任意)を入力し、「登録して選択」で
 * peopleにレコードを作成してそのまま選択状態にする。正式な企業への紐付けは
 * 担当者詳細ページ(/people/[id])で行う(CreateCompanyInlineFormと同じ簡易入力方針)。
 */
export function CreatePersonInlineForm({
  initialName,
  onCreated,
}: {
  initialName: string;
  onCreated: (item: SearchResultItem) => void;
}) {
  const [name, setName] = useState(initialName);
  const [companyNameRaw, setCompanyNameRaw] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError("担当者名を入力してください");
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      const created = await createPersonInline(name.trim(), companyNameRaw.trim() || null);
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
      <label className="flex flex-col gap-1">
        <span className="text-xs text-neutral-600">企業名(仮、任意)</span>
        <input
          type="text"
          value={companyNameRaw}
          onChange={(e) => setCompanyNameRaw(e.target.value)}
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
