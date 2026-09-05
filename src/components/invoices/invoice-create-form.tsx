"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SearchSelectModal, type SearchResultItem } from "@/components/ui/search-select-modal";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { usePageBreadcrumbs } from "@/components/layout/page-header-context";
import { searchProjectsByStatus } from "@/lib/search-select/actions";
import { createInvoiceForProject } from "@/lib/invoices/actions";
import { getProjectDocumentInfo } from "@/lib/projects/get-project-document-info";
import { updateProjectBudget } from "@/lib/projects/actions";
import { amountDiffersFromBudget } from "@/lib/projects/amount-sync";
import type { ProjectStatus } from "@/lib/supabase/database.types";

/** 請求書作成画面に出せるのは契約済以降のステータスの案件のみ(SCREEN_SPEC.md 7章)。 */
const INVOICE_PROJECT_STATUSES: ProjectStatus[] = [
  "contracted",
  "in_progress",
  "inspected",
  "payment_pending",
  "completed",
];

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/** 精算管理の請求書作成フォーム(SCREEN_SPEC.md 7章)。Misoca APIで実際に請求書を発行する。 */
export function InvoiceCreateForm() {
  const router = useRouter();
  usePageBreadcrumbs([{ label: "精算管理", href: "/invoices" }, { label: "新規作成" }]);

  const [project, setProject] = useState<SearchResultItem | null>(null);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [amount, setAmount] = useState<number>(0);
  const [originalBudget, setOriginalBudget] = useState<number | null>(null);
  const [issuedDate, setIssuedDate] = useState(todayIso());
  const [dueDate, setDueDate] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // 金額が案件のbudgetと異なる場合に一度確認を挟むための保留アクション
  const [pendingFinalize, setPendingFinalize] = useState<(() => Promise<void>) | null>(null);

  async function handleSelectProject(item: SearchResultItem) {
    setProject(item);
    // 案件の現在の金額を初期値として埋める。あくまで初期値なので、この後上書きできる。
    const info = await getProjectDocumentInfo(item.id);
    setOriginalBudget(info?.budget ?? null);
    setAmount(info?.budget ?? 0);
  }

  async function finalizeWithBudgetConfirm(action: () => Promise<void>) {
    if (amountDiffersFromBudget(amount, originalBudget)) {
      setPendingFinalize(() => action);
      return;
    }
    await action();
  }

  async function handleCreate() {
    await finalizeWithBudgetConfirm(async () => {
      setError(null);
      if (!project) {
        setError("案件を選択してください。");
        return;
      }
      if (amount <= 0) {
        setError("金額を入力してください。");
        return;
      }
      setIsSubmitting(true);
      const result = await createInvoiceForProject({
        projectId: project.id,
        amount,
        issuedDate,
        dueDate: dueDate || null,
      });
      setIsSubmitting(false);
      if (!result.success) {
        setError(result.error);
        return;
      }
      router.push(`/invoices/${result.id}`);
    });
  }

  async function handleConfirmBudgetSync() {
    const action = pendingFinalize;
    setPendingFinalize(null);
    if (project) {
      await updateProjectBudget(project.id, amount);
      setOriginalBudget(amount);
    }
    await action?.();
  }

  async function handleCancelBudgetSync() {
    const action = pendingFinalize;
    setPendingFinalize(null);
    await action?.();
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-lg border border-neutral-200 bg-neutral-0 p-6">
        {error && <p className="mb-3 text-sm text-danger-text">{error}</p>}

        <div className="flex flex-col gap-4">
          <div>
            <p className="text-xs text-neutral-600">案件</p>
            <div className="mt-1 flex items-center gap-2">
              <span className="text-sm text-neutral-900">
                {project ? `${project.sublabel ?? "(企業不明)"} / ${project.label}` : "未選択"}
              </span>
              <button
                type="button"
                onClick={() => setShowProjectModal(true)}
                className="text-xs text-primary-600 hover:underline"
              >
                案件を選択
              </button>
            </div>
          </div>

          <label className="flex flex-col gap-1">
            <span className="text-xs text-neutral-600">金額(税別)</span>
            <input
              type="number"
              min={0}
              value={amount || ""}
              onChange={(e) => setAmount(Number(e.target.value))}
              className="w-48 rounded-md border border-neutral-200 bg-neutral-0 px-3 py-2 text-sm text-neutral-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
            />
          </label>

          <div className="flex gap-4">
            <label className="flex flex-col gap-1">
              <span className="text-xs text-neutral-600">請求日</span>
              <input
                type="date"
                value={issuedDate}
                onChange={(e) => setIssuedDate(e.target.value)}
                className="rounded-md border border-neutral-200 bg-neutral-0 px-3 py-2 text-sm text-neutral-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs text-neutral-600">支払期日(任意)</span>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="rounded-md border border-neutral-200 bg-neutral-0 px-3 py-2 text-sm text-neutral-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
              />
            </label>
          </div>
        </div>

        <div className="mt-6">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={handleCreate}
            className="rounded-md bg-primary-500 px-4 py-2 text-sm text-neutral-0 disabled:opacity-40"
          >
            {isSubmitting ? "作成中..." : "Misocaで請求書を作成"}
          </button>
        </div>
      </div>

      <SearchSelectModal
        isOpen={showProjectModal}
        onClose={() => setShowProjectModal(false)}
        title="案件を選択"
        placeholder="案件名で検索"
        mode="single"
        search={(query) => searchProjectsByStatus(query, INVOICE_PROJECT_STATUSES)}
        onConfirm={(items) => {
          const [item] = items;
          if (item) void handleSelectProject(item);
        }}
      />

      <ConfirmDialog
        isOpen={pendingFinalize !== null}
        title="案件ページの金額も変更しますか?"
        message={`金額が案件に登録済みの金額(${originalBudget !== null ? `¥${originalBudget.toLocaleString()}` : "未設定"})と異なります。案件ページの金額も¥${amount.toLocaleString()}に変更しますか?`}
        confirmLabel="変更する"
        cancelLabel="変更しない"
        onConfirm={() => void handleConfirmBudgetSync()}
        onCancel={() => void handleCancelBudgetSync()}
      />
    </div>
  );
}
