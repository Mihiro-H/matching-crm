"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SearchSelectModal, type SearchResultItem } from "@/components/ui/search-select-modal";
import { CreateCompanyInlineForm } from "@/components/companies/create-company-inline-form";
import { usePageBreadcrumbs } from "@/components/layout/page-header-context";
import { searchCompanies } from "@/lib/search-select/actions";
import { createProject } from "@/lib/projects/actions";
import { PROJECT_STATUS_META } from "@/lib/status-badges";
import { PROJECT_STATUS_ORDER } from "@/lib/projects/status-transitions";
import type { ProjectStatus } from "@/lib/supabase/database.types";

// 新規作成時は「契約済」への直接設定を許可しない(クラウドサインWebhook経由専用のため)。
const STATUS_OPTIONS = PROJECT_STATUS_ORDER.filter((s) => s !== "contracted");

/** 案件管理一覧「+新規作成」(SCREEN_SPEC.md 4章)。 */
export function ProjectCreateForm() {
  const router = useRouter();
  usePageBreadcrumbs([{ label: "案件管理", href: "/projects" }, { label: "新規作成" }]);

  const [company, setCompany] = useState<SearchResultItem | null>(null);
  const [showCompanyModal, setShowCompanyModal] = useState(false);
  const [title, setTitle] = useState("");
  const [budget, setBudget] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [status, setStatus] = useState<ProjectStatus>("won");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!company) {
      setError("企業を選択してください。");
      return;
    }
    if (!title.trim()) {
      setError("案件名を入力してください。");
      return;
    }
    setIsSubmitting(true);
    const result = await createProject({
      companyId: company.id,
      title: title.trim(),
      budget: budget.trim() ? Number(budget) : null,
      startDate: startDate || null,
      endDate: endDate || null,
      status,
    });
    setIsSubmitting(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    router.push(`/projects/${result.id}`);
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border border-neutral-200 bg-neutral-0 p-6">
      {error && <p className="mb-3 text-sm text-danger-text">{error}</p>}

      <div className="flex flex-col gap-4">
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
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <label className="col-span-2 flex flex-col gap-1">
            <span className="text-xs text-neutral-600">案件名</span>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="rounded-md border border-neutral-200 bg-neutral-0 px-3 py-2 text-sm text-neutral-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-neutral-600">予算</span>
            <input
              type="number"
              min={0}
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              className="rounded-md border border-neutral-200 bg-neutral-0 px-3 py-2 text-sm text-neutral-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-neutral-600">ステータス</span>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as ProjectStatus)}
              className="rounded-md border border-neutral-200 bg-neutral-0 px-3 py-2 text-sm text-neutral-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {PROJECT_STATUS_META[s].label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-neutral-600">開始日</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="rounded-md border border-neutral-200 bg-neutral-0 px-3 py-2 text-sm text-neutral-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-neutral-600">終了日</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
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
          if (item) setCompany(item);
        }}
        createNew={{
          label: (query) => `"${query}"を新規登録`,
          render: (query, onCreated) => <CreateCompanyInlineForm initialName={query} onCreated={onCreated} />,
        }}
      />
    </form>
  );
}
