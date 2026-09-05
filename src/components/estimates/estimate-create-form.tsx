"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SearchSelectModal, type SearchResultItem } from "@/components/ui/search-select-modal";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { usePageBreadcrumbs } from "@/components/layout/page-header-context";
import { searchProjectsByStatus } from "@/lib/search-select/actions";
import {
  createEstimateDraft,
  markEstimateSentManually,
  sendEstimateViaCloudSign,
} from "@/lib/estimates/actions";
import { getProjectDocumentInfo } from "@/lib/projects/get-project-document-info";
import { updateProjectBudget } from "@/lib/projects/actions";
import { amountDiffersFromBudget } from "@/lib/projects/amount-sync";
import type { EstimateDocumentType, ProjectStatus } from "@/lib/supabase/database.types";

type Draft = { misocaDocumentId: string; title: string; pdfBase64: string };

/**
 * 案件のステータスによって、見積書作成画面に出せる案件を絞り込む
 * (SCREEN_SPEC.md 5章: 見積書は商談中・見積提出済、納品書は進行中・検収済の案件のみ)。
 */
const PROJECT_STATUSES_BY_DOCUMENT_TYPE: Record<EstimateDocumentType, ProjectStatus[]> = {
  estimate: ["negotiating", "estimate_submitted"],
  delivery_slip: ["in_progress", "inspected"],
};

function downloadBase64Pdf(base64: string, title: string) {
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  const blob = new Blob([bytes], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${title}.pdf`;
  link.click();
  URL.revokeObjectURL(url);
}

export function EstimateCreateForm() {
  const router = useRouter();
  usePageBreadcrumbs([{ label: "見積・発注", href: "/estimates" }, { label: "新規作成" }]);
  const [project, setProject] = useState<SearchResultItem | null>(null);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [documentType, setDocumentType] = useState<EstimateDocumentType>("estimate");
  const [amount, setAmount] = useState<number>(0);
  const [originalBudget, setOriginalBudget] = useState<number | null>(null);
  const [signerEmail, setSignerEmail] = useState("");
  const [signerName, setSignerName] = useState("");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // 送付/ダウンロード確定時、金額が案件のbudgetと異なる場合に一度確認を挟むための保留アクション
  const [pendingFinalize, setPendingFinalize] = useState<(() => Promise<void>) | null>(null);

  const isDeliverySlip = documentType === "delivery_slip";

  function resetProjectSelection() {
    setProject(null);
    setDraft(null);
    setAmount(0);
    setOriginalBudget(null);
    setSignerEmail("");
    setSignerName("");
  }

  async function handleSelectProject(item: SearchResultItem) {
    setProject(item);
    setDraft(null);
    // 企業に登録済みの送付先メール(無ければ最新の担当者)・案件の現在の金額を初期値として埋める。
    // あくまで初期値なので、この後ユーザーが自由に上書きできる。
    const info = await getProjectDocumentInfo(item.id);
    setSignerEmail(info?.signerEmail ?? "");
    setSignerName(info?.signerName ?? "");
    setOriginalBudget(info?.budget ?? null);
    setAmount(info?.budget ?? 0);
  }

  function handleDocumentTypeChange(next: EstimateDocumentType) {
    setDocumentType(next);
    // ステータス絞り込み条件が変わるため、選択済み案件が対象外になる可能性がある。
    // 誤った組み合わせのまま送信されないよう、案件選択からやり直してもらう。
    resetProjectSelection();
  }

  function invalidateDraft() {
    setDraft(null);
  }

  async function handlePreview() {
    setError(null);
    if (!project) {
      setError("案件を選択してください。");
      return;
    }
    if (amount <= 0) {
      setError("金額を入力してください。");
      return;
    }
    setIsPreviewing(true);
    const result = await createEstimateDraft({ projectId: project.id, documentType, amount });
    setIsPreviewing(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    setDraft({ misocaDocumentId: result.misocaDocumentId, title: result.title, pdfBase64: result.pdfBase64 });
  }

  /** 金額が案件のbudgetと異なる場合、確認ポップアップを挟んでから本処理を実行する。 */
  async function finalizeWithBudgetConfirm(action: () => Promise<void>) {
    if (amountDiffersFromBudget(amount, originalBudget)) {
      setPendingFinalize(() => action);
      return;
    }
    await action();
  }

  async function handleSendViaCloudSign() {
    await finalizeWithBudgetConfirm(async () => {
      setError(null);
      if (!project || !draft) return;
      if (!signerEmail.trim() || !signerName.trim()) {
        setError("クラウドサインの送付先(氏名・メールアドレス)を入力してください。");
        return;
      }
      setIsSubmitting(true);
      const result = await sendEstimateViaCloudSign({
        projectId: project.id,
        documentType,
        amount,
        misocaDocumentId: draft.misocaDocumentId,
        title: draft.title,
        signerEmail,
        signerName,
      });
      setIsSubmitting(false);
      if (!result.success) {
        setError(result.error);
        return;
      }
      router.push("/estimates");
    });
  }

  async function handleDownload() {
    await finalizeWithBudgetConfirm(async () => {
      setError(null);
      if (!project || !draft) return;
      downloadBase64Pdf(draft.pdfBase64, draft.title);

      setIsSubmitting(true);
      const result = await markEstimateSentManually({
        projectId: project.id,
        documentType,
        amount,
        misocaDocumentId: draft.misocaDocumentId,
      });
      setIsSubmitting(false);
      if (!result.success) {
        setError(result.error);
        return;
      }
      router.push("/estimates");
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
          <label className="flex flex-col gap-1">
            <span className="text-xs text-neutral-600">種別</span>
            <select
              value={documentType}
              onChange={(e) => handleDocumentTypeChange(e.target.value as EstimateDocumentType)}
              className="w-40 rounded-md border border-neutral-200 bg-neutral-0 px-3 py-2 text-sm text-neutral-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
            >
              <option value="estimate">見積書</option>
              <option value="delivery_slip">納品書</option>
            </select>
          </label>

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
              disabled={isDeliverySlip}
              onChange={(e) => {
                setAmount(Number(e.target.value));
                invalidateDraft();
              }}
              className="w-48 rounded-md border border-neutral-200 bg-neutral-0 px-3 py-2 text-sm text-neutral-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100 disabled:bg-page-bg disabled:text-neutral-400"
            />
            {isDeliverySlip && (
              <span className="text-xs text-neutral-400">納品書の金額は案件の金額から自動反映されます。</span>
            )}
          </label>

          {!isDeliverySlip && (
            <div className="flex flex-col gap-1 rounded-md border border-neutral-100 bg-page-bg p-3">
              <span className="text-xs text-neutral-600">
                クラウドサイン送付先(案件を選択すると企業に登録済みの送付先を自動入力します。この場で上書きすると次回以降のデフォルトも更新されます)
              </span>
              <div className="flex flex-wrap gap-2">
                <input
                  type="text"
                  placeholder="宛先氏名"
                  value={signerName}
                  onChange={(e) => setSignerName(e.target.value)}
                  className="w-48 rounded-md border border-neutral-200 bg-neutral-0 px-3 py-2 text-sm text-neutral-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
                />
                <input
                  type="email"
                  placeholder="宛先メールアドレス"
                  value={signerEmail}
                  onChange={(e) => setSignerEmail(e.target.value)}
                  className="w-64 rounded-md border border-neutral-200 bg-neutral-0 px-3 py-2 text-sm text-neutral-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
                />
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={isPreviewing}
            onClick={handlePreview}
            className="rounded-md border border-neutral-200 px-4 py-2 text-sm text-neutral-600 hover:bg-page-bg disabled:opacity-40"
          >
            {isPreviewing ? "作成中..." : draft ? "PDFを再作成" : "PDFプレビュー"}
          </button>
          {!isDeliverySlip && (
            <button
              type="button"
              disabled={isSubmitting || !draft}
              onClick={handleSendViaCloudSign}
              className="rounded-md bg-primary-500 px-4 py-2 text-sm text-neutral-0 disabled:opacity-40"
            >
              クラウドサインで送付
            </button>
          )}
          <button
            type="button"
            disabled={isSubmitting || !draft}
            onClick={handleDownload}
            className="rounded-md border border-neutral-200 px-4 py-2 text-sm text-neutral-900 hover:bg-page-bg disabled:opacity-40"
          >
            PDFをダウンロードして手動送付
          </button>
        </div>
        {!draft && (
          <p className="mt-2 text-xs text-neutral-400">
            送付前に「PDFプレビュー」でMisoca上に実際の書類を作成してください。
          </p>
        )}
      </div>

      {draft && (
        <div className="rounded-lg border border-neutral-200 bg-neutral-0 p-4">
          <p className="mb-2 text-xs text-neutral-600">{draft.title}</p>
          <embed
            src={`data:application/pdf;base64,${draft.pdfBase64}`}
            type="application/pdf"
            className="h-[70vh] w-full rounded-md border border-neutral-100"
          />
        </div>
      )}

      <SearchSelectModal
        isOpen={showProjectModal}
        onClose={() => setShowProjectModal(false)}
        title="案件を選択"
        placeholder="案件名で検索"
        mode="single"
        search={(query) => searchProjectsByStatus(query, PROJECT_STATUSES_BY_DOCUMENT_TYPE[documentType])}
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
