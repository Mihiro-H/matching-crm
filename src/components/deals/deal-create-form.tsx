"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { SearchSelectModal, type SearchResultItem } from "@/components/ui/search-select-modal";
import { CreatePersonInlineForm } from "@/components/people/create-person-inline-form";
import { usePageBreadcrumbs } from "@/components/layout/page-header-context";
import { searchAssignableUsers, searchPeople } from "@/lib/search-select/actions";
import { createDealManual } from "@/lib/deals/actions";
import { JOB_CATEGORIES, JOB_CATEGORY_LABELS } from "@/lib/job-categories";
import type { DealSource, JobCategory } from "@/lib/supabase/database.types";

const SOURCE_OPTIONS: { value: Exclude<DealSource, "form">; label: string }[] = [
  { value: "referral", label: "紹介" },
  { value: "other", label: "その他" },
];

/**
 * 商談管理一覧「+新規作成」(SCREEN_SPEC.md「商談管理」)。
 * 外部フォーム経由(source='form')以外の手段で得た商談を手動登録する画面。
 * 主担当・サブ担当もこの画面で登録できる(どちらも任意)。
 */
export function DealCreateForm() {
  const router = useRouter();
  usePageBreadcrumbs([{ label: "商談管理", href: "/deals" }, { label: "新規作成" }]);

  const [person, setPerson] = useState<SearchResultItem | null>(null);
  const [showPersonModal, setShowPersonModal] = useState(false);
  const [primaryAssignee, setPrimaryAssignee] = useState<SearchResultItem | null>(null);
  const [secondaryAssignees, setSecondaryAssignees] = useState<SearchResultItem[]>([]);
  const [assigneeModal, setAssigneeModal] = useState<"primary" | "secondary" | null>(null);
  const [source, setSource] = useState<Exclude<DealSource, "form">>("referral");
  const [jobCategories, setJobCategories] = useState<JobCategory[]>([]);
  const [inquiryBody, setInquiryBody] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleJobCategory(category: JobCategory) {
    setJobCategories((prev) =>
      prev.includes(category) ? prev.filter((c) => c !== category) : [...prev, category]
    );
  }

  function handlePrimarySelected(items: SearchResultItem[]) {
    const [item] = items;
    if (!item) return;
    setPrimaryAssignee(item);
    // 主担当としても選ばれたユーザーがサブ担当に重複表示されないようにする。
    setSecondaryAssignees((prev) => prev.filter((a) => a.id !== item.id));
  }

  function handleSecondaryAdded(items: SearchResultItem[]) {
    setSecondaryAssignees((prev) => {
      const next = [...prev];
      for (const item of items) {
        if (item.id === primaryAssignee?.id) continue;
        if (!next.some((a) => a.id === item.id)) next.push(item);
      }
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!person) {
      setError("企業担当者を選択してください。");
      return;
    }
    setIsSubmitting(true);
    const result = await createDealManual({
      personId: person.id,
      jobCategories,
      inquiryBody: inquiryBody || null,
      source,
      primaryAssigneeId: primaryAssignee?.id ?? null,
      secondaryAssigneeIds: secondaryAssignees.map((a) => a.id),
    });
    setIsSubmitting(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    router.push(`/deals/${result.number}`);
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border border-neutral-200 bg-neutral-0 p-6">
      {error && <p className="mb-3 text-sm text-danger-text">{error}</p>}

      <div className="flex flex-col gap-4">
        <div>
          <p className="text-xs text-neutral-600">企業担当者</p>
          <div className="mt-1 flex items-center gap-2">
            <span className="text-sm text-neutral-900">
              {person ? `${person.sublabel ?? "(企業未登録)"} / ${person.label}` : "未選択"}
            </span>
            <button
              type="button"
              onClick={() => setShowPersonModal(true)}
              className="text-xs text-primary-600 hover:underline"
            >
              企業担当者を選択
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-neutral-600">主担当</p>
            <div className="mt-1 flex items-center gap-2">
              <span className="text-sm text-neutral-900">{primaryAssignee ? primaryAssignee.label : "未選択"}</span>
              <button
                type="button"
                onClick={() => setAssigneeModal("primary")}
                className="text-xs text-primary-600 hover:underline"
              >
                主担当を選択
              </button>
            </div>
          </div>
          <div>
            <p className="text-xs text-neutral-600">サブ担当</p>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              {secondaryAssignees.map((a) => (
                <span
                  key={a.id}
                  className="flex items-center gap-1 rounded-full bg-primary-50 py-1 pl-3 pr-1 text-sm text-primary-600"
                >
                  {a.label}
                  <button
                    type="button"
                    aria-label={`${a.label}を削除`}
                    onClick={() => setSecondaryAssignees((prev) => prev.filter((x) => x.id !== a.id))}
                    className="rounded-full p-0.5 hover:bg-primary-100"
                  >
                    <X size={12} />
                  </button>
                </span>
              ))}
              <button
                type="button"
                onClick={() => setAssigneeModal("secondary")}
                className="text-xs text-primary-600 hover:underline"
              >
                サブ担当を追加
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <label className="flex flex-col gap-1">
            <span className="text-xs text-neutral-600">流入経路</span>
            <select
              value={source}
              onChange={(e) => setSource(e.target.value as Exclude<DealSource, "form">)}
              className="rounded-md border border-neutral-200 bg-neutral-0 px-3 py-2 text-sm text-neutral-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
            >
              {SOURCE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
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
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="mt-6 rounded-md bg-primary-500 px-4 py-2 text-sm text-neutral-0 disabled:opacity-40"
      >
        登録
      </button>

      <SearchSelectModal
        isOpen={showPersonModal}
        onClose={() => setShowPersonModal(false)}
        title="企業担当者を選択"
        placeholder="担当者名で検索"
        mode="single"
        search={searchPeople}
        onConfirm={(items) => {
          const [item] = items;
          if (item) setPerson(item);
        }}
        createNew={{
          label: (query) => `"${query}"を新規登録`,
          render: (query, onCreated) => <CreatePersonInlineForm initialName={query} onCreated={onCreated} />,
        }}
      />
      <SearchSelectModal
        isOpen={assigneeModal === "primary"}
        onClose={() => setAssigneeModal(null)}
        title="主担当を選択"
        placeholder="氏名で検索"
        mode="single"
        search={searchAssignableUsers}
        onConfirm={handlePrimarySelected}
      />
      <SearchSelectModal
        isOpen={assigneeModal === "secondary"}
        onClose={() => setAssigneeModal(null)}
        title="サブ担当を選択"
        placeholder="氏名で検索"
        mode="multiple"
        confirmLabel="追加"
        search={searchAssignableUsers}
        onConfirm={handleSecondaryAdded}
      />
    </form>
  );
}
