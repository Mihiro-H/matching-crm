"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { SearchSelectModal, type SearchResultItem } from "@/components/ui/search-select-modal";
import { searchAssignableUsers } from "@/lib/search-select/actions";
import { addSecondaryDealAssignee, removeDealAssignee, setDealPrimaryAssignee } from "@/lib/deals/actions";
import type { DealSecondaryAssignee } from "@/lib/deals/get-deal-assignees";

/**
 * 商談の担当者セクション(SCREEN_SPEC.md「商談管理」)。主担当・サブ担当を1箇所にまとめて
 * 表示・編集する(以前は主担当がDealInfoSectionに表示のみで編集できず、サブ担当だけ
 * 別カードに分かれていて分かりづらかったため統合した)。
 * 主担当はdeals.assigned_user_id(単一カラム)、サブ担当はdeal_assignees(複数行)と
 * 保存先は別だが、UI上はprojects/assignee-section.tsxと同じ見た目に揃える。
 * 議事録の閲覧範囲は主担当+サブ担当の両方が対象になる(meeting-notes/visibility.ts参照)。
 */
export function DealAssigneeSection({
  dealId,
  primaryAssigneeName,
  initialSecondaryAssignees,
  canEdit,
}: {
  dealId: string;
  primaryAssigneeName: string | null;
  initialSecondaryAssignees: DealSecondaryAssignee[];
  canEdit: boolean;
}) {
  const [primaryName, setPrimaryName] = useState(primaryAssigneeName);
  const [secondaries, setSecondaries] = useState(initialSecondaryAssignees);
  const [isEditing, setIsEditing] = useState(false);
  const [modal, setModal] = useState<"primary" | "secondary" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handlePrimarySelected(items: SearchResultItem[]) {
    const [item] = items;
    if (!item) return;
    const result = await setDealPrimaryAssignee(dealId, item.id);
    if (!result.success) {
      setError(result.error);
      return;
    }
    setPrimaryName(item.label);
    // 新しい主担当が既にサブ担当リストに居た場合、setDealPrimaryAssignee側でも
    // DB上は外しているため、表示側も揃える(重複表示防止)。
    setSecondaries((prev) => prev.filter((a) => a.userId !== item.id));
  }

  async function handleSecondaryAdded(items: SearchResultItem[]) {
    for (const item of items) {
      const result = await addSecondaryDealAssignee(dealId, item.id);
      if (!result.success) {
        setError(result.error);
        continue;
      }
      setSecondaries((prev) => [...prev, { id: item.id, userId: item.id, name: item.label }]);
    }
  }

  async function handleRemoveSecondary(assigneeId: string) {
    setError(null);
    const previous = secondaries;
    setSecondaries((prev) => prev.filter((a) => a.id !== assigneeId));
    const result = await removeDealAssignee(dealId, assigneeId);
    if (!result.success) {
      setError(result.error);
      setSecondaries(previous);
    }
  }

  return (
    <div className="rounded-lg border border-neutral-200 bg-neutral-0 p-6">
      <div className="flex items-center justify-between">
        <h3 className="text-md text-neutral-900">担当者</h3>
        {canEdit && (
          <button
            type="button"
            onClick={() => setIsEditing((v) => !v)}
            className="rounded-md border border-neutral-200 px-3 py-1.5 text-sm text-neutral-600 hover:bg-page-bg"
          >
            {isEditing ? "完了" : "編集"}
          </button>
        )}
      </div>
      {error && <p className="mt-2 text-sm text-danger-text">{error}</p>}

      <div className="mt-3 flex flex-col gap-3">
        <div>
          <p className="text-xs text-neutral-600">主担当</p>
          <div className="mt-1 flex items-center gap-2">
            {primaryName ? (
              <span className="text-sm text-neutral-900">{primaryName}</span>
            ) : (
              <span className="text-sm text-neutral-600">未アサイン</span>
            )}
            {isEditing && (
              <button
                type="button"
                onClick={() => setModal("primary")}
                className="text-xs text-primary-600 hover:underline"
              >
                主担当を変更
              </button>
            )}
          </div>
        </div>

        <div>
          <p className="text-xs text-neutral-600">サブ担当</p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            {secondaries.map((a) => (
              <span
                key={a.id}
                className={`flex items-center gap-1 rounded-full bg-primary-50 py-1 text-sm text-primary-600 ${
                  isEditing ? "pl-3 pr-1" : "px-3"
                }`}
              >
                {a.name}
                {isEditing && (
                  <button
                    type="button"
                    aria-label={`${a.name}を削除`}
                    onClick={() => handleRemoveSecondary(a.id)}
                    className="rounded-full p-0.5 hover:bg-primary-100"
                  >
                    <X size={12} />
                  </button>
                )}
              </span>
            ))}
            {secondaries.length === 0 && !isEditing && (
              <span className="text-sm text-neutral-600">未アサイン</span>
            )}
            {isEditing && (
              <button
                type="button"
                onClick={() => setModal("secondary")}
                className="text-xs text-primary-600 hover:underline"
              >
                サブ担当を追加
              </button>
            )}
          </div>
        </div>
      </div>

      <SearchSelectModal
        isOpen={modal === "primary"}
        onClose={() => setModal(null)}
        title="主担当を選択"
        placeholder="氏名で検索"
        mode="single"
        search={searchAssignableUsers}
        onConfirm={handlePrimarySelected}
      />
      <SearchSelectModal
        isOpen={modal === "secondary"}
        onClose={() => setModal(null)}
        title="サブ担当を選択"
        placeholder="氏名で検索"
        mode="multiple"
        confirmLabel="追加"
        search={searchAssignableUsers}
        onConfirm={handleSecondaryAdded}
      />
    </div>
  );
}
