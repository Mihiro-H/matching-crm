"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { SearchSelectModal, type SearchResultItem } from "@/components/ui/search-select-modal";
import { CreateCompanyInlineForm } from "@/components/companies/create-company-inline-form";
import { CreatePersonInlineForm } from "@/components/people/create-person-inline-form";
import { usePageBreadcrumbs } from "@/components/layout/page-header-context";
import { searchAssignableUsers, searchCompanies, searchPeople } from "@/lib/search-select/actions";
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
  const [contact, setContact] = useState<SearchResultItem | null>(null);
  const [showContactModal, setShowContactModal] = useState(false);
  const [primaryAssignee, setPrimaryAssignee] = useState<SearchResultItem | null>(null);
  const [secondaryAssignees, setSecondaryAssignees] = useState<SearchResultItem[]>([]);
  const [assigneeModal, setAssigneeModal] = useState<"primary" | "secondary" | null>(null);
  const [title, setTitle] = useState("");
  const [budget, setBudget] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [status, setStatus] = useState<ProjectStatus>("won");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      contactId: contact?.id ?? null,
      title: title.trim(),
      budget: budget.trim() ? Number(budget) : null,
      startDate: startDate || null,
      endDate: endDate || null,
      status,
      primaryAssigneeId: primaryAssignee?.id ?? null,
      secondaryAssigneeIds: secondaryAssignees.map((a) => a.id),
    });
    setIsSubmitting(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    router.push(`/projects/${result.number}`);
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

        <div>
          <p className="text-xs text-neutral-600">企業担当者(任意)</p>
          <div className="mt-1 flex items-center gap-2">
            <span className="text-sm text-neutral-900">{contact ? contact.label : "未選択"}</span>
            <button
              type="button"
              onClick={() => setShowContactModal(true)}
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
            <span className="text-xs text-neutral-600">金額</span>
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
      <SearchSelectModal
        isOpen={showContactModal}
        onClose={() => setShowContactModal(false)}
        title="企業担当者を選択"
        placeholder="担当者名で検索"
        mode="single"
        search={searchPeople}
        onConfirm={(items) => {
          const [item] = items;
          if (item) setContact(item);
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
