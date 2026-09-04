"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { SearchSelectModal, type SearchResultItem } from "@/components/ui/search-select-modal";
import { searchUsers } from "@/lib/search-select/actions";
import { addSecondaryAssignee, removeAssignee, setPrimaryAssignee } from "@/lib/projects/actions";
import type { ProjectAssignee } from "@/lib/projects/get-project-assignees";

export function AssigneeSection({
  projectId,
  initialAssignees,
  canEdit,
}: {
  projectId: string;
  initialAssignees: ProjectAssignee[];
  canEdit: boolean;
}) {
  const [assignees, setAssignees] = useState(initialAssignees);
  const [isEditing, setIsEditing] = useState(false);
  const [modal, setModal] = useState<"primary" | "secondary" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const primary = assignees.find((a) => a.role === "primary");
  const secondaries = assignees.filter((a) => a.role === "secondary");

  async function handlePrimarySelected(items: SearchResultItem[]) {
    const [item] = items;
    if (!item) return;
    const result = await setPrimaryAssignee(projectId, item.id);
    if (!result.success) {
      setError(result.error);
      return;
    }
    setAssignees((prev) => {
      const withoutOldPrimary = prev.map((a) =>
        a.role === "primary" ? { ...a, role: "secondary" as const } : a
      );
      const existingIndex = withoutOldPrimary.findIndex((a) => a.userId === item.id);
      if (existingIndex >= 0) {
        withoutOldPrimary[existingIndex] = { ...withoutOldPrimary[existingIndex], role: "primary" };
        return withoutOldPrimary;
      }
      return [
        ...withoutOldPrimary,
        { id: item.id, userId: item.id, name: item.label, role: "primary" as const },
      ];
    });
  }

  async function handleSecondaryAdded(items: SearchResultItem[]) {
    for (const item of items) {
      const result = await addSecondaryAssignee(projectId, item.id);
      if (!result.success) {
        setError(result.error);
        continue;
      }
      setAssignees((prev) => [
        ...prev,
        { id: item.id, userId: item.id, name: item.label, role: "secondary" as const },
      ]);
    }
  }

  async function handleRemove(assigneeId: string) {
    setError(null);
    const previous = assignees;
    setAssignees((prev) => prev.filter((a) => a.id !== assigneeId));
    const result = await removeAssignee(projectId, assigneeId);
    if (!result.success) {
      setError(result.error);
      setAssignees(previous);
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
            {primary ? (
              <AssigneeChip
                name={primary.name}
                onRemove={isEditing ? () => handleRemove(primary.id) : undefined}
              />
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
              <AssigneeChip
                key={a.id}
                name={a.name}
                onRemove={isEditing ? () => handleRemove(a.id) : undefined}
              />
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
        search={searchUsers}
        onConfirm={handlePrimarySelected}
      />
      <SearchSelectModal
        isOpen={modal === "secondary"}
        onClose={() => setModal(null)}
        title="サブ担当を選択"
        placeholder="氏名で検索"
        mode="multiple"
        confirmLabel="追加"
        search={searchUsers}
        onConfirm={handleSecondaryAdded}
      />
    </div>
  );
}

function AssigneeChip({ name, onRemove }: { name: string; onRemove?: () => void }) {
  return (
    <span
      className={`flex items-center gap-1 rounded-full bg-primary-50 py-1 text-sm text-primary-600 ${
        onRemove ? "pl-3 pr-1" : "px-3"
      }`}
    >
      {name}
      {onRemove && (
        <button
          type="button"
          aria-label={`${name}を削除`}
          onClick={onRemove}
          className="rounded-full p-0.5 hover:bg-primary-100"
        >
          <X size={12} />
        </button>
      )}
    </span>
  );
}
