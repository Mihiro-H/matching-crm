"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { deleteMeetingNote } from "@/lib/meeting-notes/actions";
import { formatDateJa } from "@/lib/format";
import { PAGE_SIZE } from "@/lib/pagination";
import type { MeetingNoteCard } from "@/lib/meeting-notes/get-meeting-notes";

/** 議事録一覧(SCREEN_SPEC.md 6章)。行右端に編集・削除アイコンを置く。 */
export function MeetingNotesTable({
  notes,
  canEdit,
  page,
  totalCount,
  currentQuery,
}: {
  notes: MeetingNoteCard[];
  canEdit: boolean;
  page: number;
  totalCount: number;
  currentQuery: Record<string, string>;
}) {
  const router = useRouter();

  // 親(Server Component)から関数は渡せないため、絞り込み条件(素のデータ)から
  // このコンポーネント内でページリンクを組み立てる。
  function hrefFor(targetPage: number) {
    const next = new URLSearchParams(currentQuery);
    if (targetPage > 1) next.set("page", String(targetPage));
    const queryString = next.toString();
    return queryString ? `/meeting-notes?${queryString}` : "/meeting-notes";
  }
  const [deleteTarget, setDeleteTarget] = useState<MeetingNoteCard | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    if (!deleteTarget) return;
    setIsDeleting(true);
    setError(null);
    const result = await deleteMeetingNote(deleteTarget.id);
    setIsDeleting(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    setDeleteTarget(null);
    router.refresh();
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-neutral-0">
      {error && <p className="p-3 text-sm text-danger-text">{error}</p>}
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-neutral-100">
            <th className="px-4 py-3 font-medium text-neutral-600">タイトル</th>
            <th className="px-4 py-3 font-medium text-neutral-600">企業名</th>
            <th className="px-4 py-3 font-medium text-neutral-600">会議日</th>
            <th className="px-4 py-3 font-medium text-neutral-600">AI要約</th>
            <th className="px-4 py-3 font-medium text-neutral-600">状態</th>
            {canEdit && <th className="w-20 px-4 py-3" />}
          </tr>
        </thead>
        <tbody>
          {notes.map((note) => (
            <tr key={note.id} className="border-b border-neutral-100 last:border-0 hover:bg-page-bg">
              <td className="px-4 py-3">
                <Link href={`/meeting-notes/${note.id}`} className="text-primary-600 hover:underline">
                  {note.title}
                </Link>
              </td>
              <td className="px-4 py-3 text-neutral-600">{note.companyName}</td>
              <td className="px-4 py-3 text-neutral-600">{formatDateJa(note.meetingAt)}</td>
              <td className="max-w-xs truncate px-4 py-3 text-neutral-600">{note.aiSummaryExcerpt}</td>
              <td className="px-4 py-3">
                <div className="flex flex-wrap gap-1">
                  {note.projectId === null && note.dealId !== null && (
                    <span className="inline-block rounded-sm bg-info-bg px-2 py-0.5 text-xs text-info-text">
                      商談に紐付け
                    </span>
                  )}
                  {note.pendingActionItemCount > 0 && (
                    <span className="inline-block rounded-sm bg-warning-bg px-2 py-0.5 text-xs text-warning-text">
                      要タスク化 {note.pendingActionItemCount}件
                    </span>
                  )}
                </div>
              </td>
              {canEdit && (
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <Link
                      href={`/meeting-notes/${note.id}?edit=true`}
                      aria-label={`${note.title}を編集`}
                      className="rounded-md p-1.5 text-neutral-600 hover:bg-page-bg hover:text-primary-600"
                    >
                      <Pencil size={16} />
                    </Link>
                    <button
                      type="button"
                      aria-label={`${note.title}を削除`}
                      onClick={() => setDeleteTarget(note)}
                      className="rounded-md p-1.5 text-neutral-600 hover:bg-danger-bg hover:text-danger-text"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              )}
            </tr>
          ))}
          {notes.length === 0 && (
            <tr>
              <td colSpan={canEdit ? 6 : 5} className="px-4 py-8 text-center text-neutral-600">
                該当する議事録はありません。
              </td>
            </tr>
          )}
        </tbody>
      </table>
      <PaginationControls page={page} totalCount={totalCount} pageSize={PAGE_SIZE} hrefFor={hrefFor} />

      <ConfirmDialog
        isOpen={deleteTarget !== null}
        title="議事録を削除しますか?"
        message={`「${deleteTarget?.title ?? ""}」を削除します。この操作は取り消せません。`}
        confirmLabel="削除する"
        cancelLabel="キャンセル"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
      {isDeleting && <p className="p-3 text-xs text-neutral-600">削除中...</p>}
    </div>
  );
}
