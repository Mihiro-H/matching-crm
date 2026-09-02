"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SearchSelectModal, type SearchResultItem } from "@/components/ui/search-select-modal";
import { usePageBreadcrumbs } from "@/components/layout/page-header-context";
import { CreateCompanyInlineForm } from "@/components/companies/create-company-inline-form";
import { searchCompanies } from "@/lib/search-select/actions";
import { advanceContactStatus, markContactLost, markContactWon, replaceContact } from "@/lib/contacts/actions";
import { getNextStatusOptions } from "@/lib/contacts/status";
import { CONTACT_STATUS_META } from "@/lib/status-badges";
import type { ContactDetail } from "@/lib/contacts/get-contact";

export function ContactDetailActions({ contact }: { contact: ContactDetail }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [showLostForm, setShowLostForm] = useState(false);
  const [lostReason, setLostReason] = useState("");
  const [showCompanyModal, setShowCompanyModal] = useState(false);
  const [showReplaceForm, setShowReplaceForm] = useState(false);
  const [replaceName, setReplaceName] = useState("");
  const [replaceEmail, setReplaceEmail] = useState("");

  const nextOptions = getNextStatusOptions(contact.status);

  usePageBreadcrumbs([
    { label: "商談・担当者管理", href: "/contacts" },
    { label: contact.companyName ?? contact.company_name_raw ?? contact.name },
  ]);

  async function handleAdvance(newStatus: "in_progress" | "negotiating") {
    setError(null);
    setIsPending(true);
    const result = await advanceContactStatus(contact.id, contact.status, newStatus);
    setIsPending(false);
    if (!result.success) setError(result.error);
    else router.refresh();
  }

  function handleWonClick() {
    if (contact.company_id) {
      handleWonWithCompany(contact.company_id);
    } else {
      setShowCompanyModal(true);
    }
  }

  async function handleWonWithCompany(companyId: string) {
    setError(null);
    setIsPending(true);
    const result = await markContactWon(contact.id, companyId);
    setIsPending(false);
    if (!result.success) setError(result.error);
    else router.refresh();
  }

  async function handleLostSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsPending(true);
    const result = await markContactLost(contact.id, lostReason);
    setIsPending(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    setShowLostForm(false);
    router.refresh();
  }

  async function handleReplaceSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!replaceName.trim()) {
      setError("新しい担当者の氏名を入力してください。");
      return;
    }
    setIsPending(true);
    const result = await replaceContact(contact.id, {
      name: replaceName.trim(),
      email: replaceEmail.trim() || null,
    });
    setIsPending(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    router.push(`/contacts/${result.newContactId}`);
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
              disabled={isPending}
              onClick={() => setShowLostForm((v) => !v)}
              className="rounded-md border border-danger-text px-3 py-1.5 text-sm text-danger-text disabled:opacity-40"
            >
              失注にする
            </button>
          ) : status === "won" ? (
            <button
              key={status}
              type="button"
              disabled={isPending}
              onClick={handleWonClick}
              className="rounded-md bg-success-text px-3 py-1.5 text-sm text-neutral-0 disabled:opacity-40"
            >
              受注する
            </button>
          ) : (
            <button
              key={status}
              type="button"
              disabled={isPending}
              onClick={() => handleAdvance(status)}
              className="rounded-md bg-primary-500 px-3 py-1.5 text-sm text-neutral-0 disabled:opacity-40"
            >
              {CONTACT_STATUS_META[status].label}にする
            </button>
          )
        )}

        {contact.is_current && (
          <button
            type="button"
            disabled={isPending}
            onClick={() => setShowReplaceForm((v) => !v)}
            className="rounded-md border border-neutral-200 px-3 py-1.5 text-sm text-neutral-600 hover:bg-page-bg disabled:opacity-40"
          >
            担当者を交代する
          </button>
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
            disabled={isPending}
            className="self-start rounded-md bg-danger-text px-4 py-2 text-sm text-neutral-0 disabled:opacity-40"
          >
            失注として確定
          </button>
        </form>
      )}

      {showReplaceForm && (
        <form onSubmit={handleReplaceSubmit} className="mt-4 flex flex-col gap-2 rounded-md border border-neutral-200 p-4">
          <label className="flex flex-col gap-1">
            <span className="text-xs text-neutral-600">新しい担当者の氏名</span>
            <input
              type="text"
              value={replaceName}
              onChange={(e) => setReplaceName(e.target.value)}
              className="rounded-md border border-neutral-200 bg-neutral-0 px-3 py-2 text-sm text-neutral-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-neutral-600">メールアドレス(任意)</span>
            <input
              type="email"
              value={replaceEmail}
              onChange={(e) => setReplaceEmail(e.target.value)}
              className="rounded-md border border-neutral-200 bg-neutral-0 px-3 py-2 text-sm text-neutral-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
            />
          </label>
          <button
            type="submit"
            disabled={isPending}
            className="self-start rounded-md bg-primary-500 px-4 py-2 text-sm text-neutral-0 disabled:opacity-40"
          >
            交代を確定
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
        onConfirm={(items: SearchResultItem[]) => {
          const [item] = items;
          if (item) handleWonWithCompany(item.id);
        }}
        createNew={{
          label: (query) => `"${query}"を新規登録`,
          render: (query, onCreated) => (
            <CreateCompanyInlineForm initialName={query} onCreated={onCreated} />
          ),
        }}
      />
    </div>
  );
}
