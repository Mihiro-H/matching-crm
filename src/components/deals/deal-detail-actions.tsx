"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SearchSelectModal, type SearchResultItem } from "@/components/ui/search-select-modal";
import { CreateCompanyInlineForm } from "@/components/companies/create-company-inline-form";
import { searchCompanies } from "@/lib/search-select/actions";
import { advanceDealStatus, markDealLost, markDealWon } from "@/lib/deals/actions";
import { getNextStatusOptions } from "@/lib/deals/status";
import { DEAL_STATUS_META } from "@/lib/status-badges";
import type { DealDetail } from "@/lib/deals/get-deal";
import type { DealStatus } from "@/lib/supabase/database.types";

export function DealDetailActions({ deal, canEdit }: { deal: DealDetail; canEdit: boolean }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [showLostForm, setShowLostForm] = useState(false);
  const [lostReason, setLostReason] = useState("");
  const [showWonForm, setShowWonForm] = useState(false);
  const [wonReason, setWonReason] = useState("");
  const [wonCompany, setWonCompany] = useState<SearchResultItem | null>(null);
  const [showCompanyModal, setShowCompanyModal] = useState(false);

  const nextOptions = getNextStatusOptions(deal.status);

  async function handleAdvance(newStatus: Exclude<DealStatus, "new" | "won" | "lost">) {
    setError(null);
    setIsPending(true);
    const result = await advanceDealStatus(deal.id, deal.status, newStatus);
    setIsPending(false);
    if (!result.success) setError(result.error);
    else router.refresh();
  }

  async function handleLostSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsPending(true);
    const result = await markDealLost(deal.id, lostReason);
    setIsPending(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    setShowLostForm(false);
    router.refresh();
  }

  async function handleWonSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const companyId = deal.companyId ?? wonCompany?.id;
    if (!companyId) {
      setError("企業を選択してください。");
      return;
    }
    setIsPending(true);
    const result = await markDealWon(deal.id, { companyId, wonReason: wonReason || null });
    setIsPending(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    setShowWonForm(false);
    router.push(`/projects/${result.projectNumber}`);
  }

  return (
    <div className="rounded-lg border border-neutral-200 bg-neutral-0 p-6">
      <h3 className="text-md text-neutral-900">ステータス操作</h3>
      {error && <p className="mt-2 text-sm text-danger-text">{error}</p>}

      <div className="mt-3 flex flex-wrap gap-2">
        {nextOptions.map((status) =>
          status === "lost" ? (
            <button
              key={status}
              type="button"
              disabled={isPending || !canEdit}
              onClick={() => setShowLostForm((v) => !v)}
              className="rounded-md border border-danger-text px-3 py-1.5 text-sm text-danger-text disabled:opacity-40"
            >
              失注にする
            </button>
          ) : status === "won" ? (
            <button
              key={status}
              type="button"
              disabled={isPending || !canEdit}
              onClick={() => setShowWonForm((v) => !v)}
              className="rounded-md bg-success-text px-3 py-1.5 text-sm text-neutral-0 disabled:opacity-40"
            >
              受注する
            </button>
          ) : (
            <button
              key={status}
              type="button"
              disabled={isPending || !canEdit}
              onClick={() => handleAdvance(status)}
              className="rounded-md bg-primary-500 px-3 py-1.5 text-sm text-neutral-0 disabled:opacity-40"
            >
              {DEAL_STATUS_META[status].label}にする
            </button>
          )
        )}
      </div>

      {showLostForm && (
        <form onSubmit={handleLostSubmit} className="mt-4 flex flex-col gap-2 rounded-md border border-neutral-200 p-4">
          <label className="flex flex-col gap-1">
            <span className="text-xs text-neutral-600">失注理由(必須)</span>
            <textarea
              value={lostReason}
              onChange={(e) => setLostReason(e.target.value)}
              rows={3}
              className="rounded-md border border-neutral-200 bg-neutral-0 px-3 py-2 text-sm text-neutral-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
            />
          </label>
          <button
            type="submit"
            disabled={isPending || !canEdit}
            className="self-start rounded-md bg-danger-text px-4 py-2 text-sm text-neutral-0 disabled:opacity-40"
          >
            失注として確定
          </button>
        </form>
      )}

      {showWonForm && (
        <form onSubmit={handleWonSubmit} className="mt-4 flex flex-col gap-2 rounded-md border border-neutral-200 p-4">
          {!deal.companyId && (
            <div>
              <p className="text-xs text-neutral-600">企業(未確定のため選択してください)</p>
              <div className="mt-1 flex items-center gap-2">
                <span className="text-sm text-neutral-900">{wonCompany ? wonCompany.label : "未選択"}</span>
                <button
                  type="button"
                  onClick={() => setShowCompanyModal(true)}
                  className="text-xs text-primary-600 hover:underline"
                >
                  企業を選択
                </button>
              </div>
            </div>
          )}
          <label className="flex flex-col gap-1">
            <span className="text-xs text-neutral-600">受注理由(任意)</span>
            <textarea
              value={wonReason}
              onChange={(e) => setWonReason(e.target.value)}
              rows={3}
              className="rounded-md border border-neutral-200 bg-neutral-0 px-3 py-2 text-sm text-neutral-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
            />
          </label>
          <p className="text-xs text-neutral-400">
            受注として確定すると、案件管理に基本情報を持った案件が自動的に作成されます。
          </p>
          <button
            type="submit"
            disabled={isPending || !canEdit}
            className="self-start rounded-md bg-success-text px-4 py-2 text-sm text-neutral-0 disabled:opacity-40"
          >
            受注として確定
          </button>
        </form>
      )}

      <SearchSelectModal
        isOpen={showCompanyModal}
        onClose={() => setShowCompanyModal(false)}
        title="企業を選択"
        placeholder="企業名で検索"
        mode="single"
        search={searchCompanies}
        onConfirm={(items) => {
          const [item] = items;
          if (item) setWonCompany(item);
        }}
        createNew={{
          label: (query) => `"${query}"を新規登録`,
          render: (query, onCreated) => <CreateCompanyInlineForm initialName={query} onCreated={onCreated} />,
        }}
      />
    </div>
  );
}
