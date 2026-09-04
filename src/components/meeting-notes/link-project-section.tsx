"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SearchSelectModal, type SearchResultItem } from "@/components/ui/search-select-modal";
import { searchProjectsByCompany } from "@/lib/search-select/actions";
import { linkProjectToMeetingNote } from "@/lib/meeting-notes/actions";

/**
 * Drive自動取り込み(source=upload)で企業までは自動特定できたが、案件がまだ
 * 紐づいていない議事録向けの手動紐付けUI(SCREEN_SPEC.md 6章)。
 */
export function LinkProjectSection({
  meetingNoteId,
  companyId,
  companyName,
}: {
  meetingNoteId: string;
  companyId: string;
  companyName: string;
}) {
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm(items: SearchResultItem[]) {
    const [item] = items;
    if (!item) return;
    const result = await linkProjectToMeetingNote(meetingNoteId, item.id);
    if (!result.success) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <div className="rounded-lg border border-warning-bg bg-warning-bg p-4">
      <p className="text-sm text-warning-text">
        案件が未紐付けです({companyName}の商談と自動判定されています)。該当する案件を選んでください。
      </p>
      {error && <p className="mt-2 text-sm text-danger-text">{error}</p>}
      <button
        type="button"
        onClick={() => setShowModal(true)}
        className="mt-2 rounded-md border border-neutral-200 bg-neutral-0 px-3 py-1.5 text-sm text-neutral-900 hover:bg-page-bg"
      >
        案件を選択
      </button>

      <SearchSelectModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="案件を選択"
        placeholder="案件名で検索"
        mode="single"
        search={(query) => searchProjectsByCompany(companyId, query)}
        onConfirm={handleConfirm}
      />
    </div>
  );
}
