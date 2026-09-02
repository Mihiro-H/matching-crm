"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SearchSelectModal, type SearchResultItem } from "@/components/ui/search-select-modal";
import { usePageBreadcrumbs } from "@/components/layout/page-header-context";
import { searchProjects } from "@/lib/search-select/actions";
import { createAndSendEstimate } from "@/lib/estimates/actions";
import { formatCurrencyJPY } from "@/lib/format";
import type { EstimateDocumentType } from "@/lib/supabase/database.types";

const DOCUMENT_TYPE_LABELS: Record<EstimateDocumentType, string> = {
  estimate: "見積書",
  order: "発注書",
};

export function EstimateCreateForm() {
  const router = useRouter();
  usePageBreadcrumbs([{ label: "見積・発注", href: "/estimates" }, { label: "新規作成" }]);
  const [project, setProject] = useState<SearchResultItem | null>(null);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [documentType, setDocumentType] = useState<EstimateDocumentType>("estimate");
  const [amount, setAmount] = useState<number>(0);
  const [showPreview, setShowPreview] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSend() {
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
    const result = await createAndSendEstimate({ projectId: project.id, documentType, amount });
    setIsSubmitting(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    router.push("/estimates");
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
            <span className="text-xs text-neutral-600">種別</span>
            <select
              value={documentType}
              onChange={(e) => setDocumentType(e.target.value as EstimateDocumentType)}
              className="w-40 rounded-md border border-neutral-200 bg-neutral-0 px-3 py-2 text-sm text-neutral-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
            >
              <option value="estimate">見積書</option>
              <option value="order">発注書</option>
            </select>
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs text-neutral-600">金額</span>
            <input
              type="number"
              min={0}
              value={amount || ""}
              onChange={(e) => setAmount(Number(e.target.value))}
              className="w-48 rounded-md border border-neutral-200 bg-neutral-0 px-3 py-2 text-sm text-neutral-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
            />
          </label>
        </div>

        <div className="mt-6 flex gap-2">
          <button
            type="button"
            onClick={() => setShowPreview(true)}
            className="rounded-md border border-neutral-200 px-4 py-2 text-sm text-neutral-600 hover:bg-page-bg"
          >
            PDFプレビュー
          </button>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={handleSend}
            className="rounded-md bg-primary-500 px-4 py-2 text-sm text-neutral-0 disabled:opacity-40"
          >
            クラウドサインで送付
          </button>
        </div>
      </div>

      <p className="text-xs text-neutral-600">
        締結ステータスが「締結済」になると、クラウドサインのWebhook経由で該当案件のステータスが自動的に「契約済」へ遷移します。
      </p>

      <SearchSelectModal
        isOpen={showProjectModal}
        onClose={() => setShowProjectModal(false)}
        title="案件を選択"
        placeholder="案件名で検索"
        mode="single"
        search={searchProjects}
        onConfirm={(items) => {
          const [item] = items;
          if (item) setProject(item);
        }}
      />

      {showPreview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/40"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowPreview(false);
          }}
        >
          <div className="max-h-[80vh] w-full max-w-lg overflow-y-auto rounded-lg bg-neutral-0 p-8 shadow-md">
            <p className="text-xs text-neutral-600">
              簡易プレビューです(実際のPDF生成・電子契約連携は未実装)
            </p>
            <h2 className="mt-4 text-xl text-neutral-900">
              {DOCUMENT_TYPE_LABELS[documentType]}
            </h2>
            <p className="mt-4 text-sm text-neutral-900">
              {project ? `${project.sublabel ?? "(企業不明)"} 御中` : "(宛先企業未選択)"}
            </p>
            <p className="mt-2 text-sm text-neutral-600">案件: {project?.label ?? "(未選択)"}</p>
            <p className="mt-6 text-2xl text-neutral-900">{formatCurrencyJPY(amount)}</p>
            <button
              type="button"
              onClick={() => setShowPreview(false)}
              className="mt-6 rounded-md border border-neutral-200 px-4 py-2 text-sm text-neutral-600 hover:bg-page-bg"
            >
              閉じる
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
