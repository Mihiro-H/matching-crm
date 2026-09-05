"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { SummarySectionList } from "@/components/meeting-notes/summary-section-list";
import { deleteMeetingNote, updateMeetingNote } from "@/lib/meeting-notes/actions";
import { formatDateJa } from "@/lib/format";
import type { MeetingNoteDetail } from "@/lib/meeting-notes/get-meeting-note";
import type { SummarySections } from "@/lib/meeting-notes/summary-sections";

const SUMMARY_SECTION_LABELS: Record<keyof SummarySections, string> = {
  keyPoints: "要点",
  decisions: "決議事項",
  nextActions: "ネクストアクション",
};

const EMPTY_SECTIONS: SummarySections = { keyPoints: [], decisions: [], nextActions: [] };

/** 箇条書き(1行1項目)のテキストエリア値 ⇔ string[] の相互変換。 */
function sectionsToLines(sections: SummarySections | null): Record<keyof SummarySections, string> {
  const source = sections ?? EMPTY_SECTIONS;
  return {
    keyPoints: source.keyPoints.join("\n"),
    decisions: source.decisions.join("\n"),
    nextActions: source.nextActions.join("\n"),
  };
}

function linesToSections(lines: Record<keyof SummarySections, string>): SummarySections {
  const toArray = (text: string) =>
    text
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
  return {
    keyPoints: toArray(lines.keyPoints),
    decisions: toArray(lines.decisions),
    nextActions: toArray(lines.nextActions),
  };
}

/** 会議日時(ISO文字列) ⇔ <input type="datetime-local"> の値。 */
function toDatetimeLocalValue(iso: string): string {
  const date = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/**
 * 議事録詳細の見出しカード(SCREEN_SPEC.md 6章「議事録の編集・削除」)。
 * タイトル・会議日時・AI要約(要点/決議事項/ネクストアクション)を編集でき、
 * 議事録自体の削除もここから行う(削除は取り消せないため確認ダイアログを挟む)。
 * 文字起こし全文(transcript_text)は事実の記録として編集対象にしない。
 */
export function MeetingNoteSummaryCard({
  note,
  canEdit,
  startInEditMode,
}: {
  note: MeetingNoteDetail;
  canEdit: boolean;
  startInEditMode: boolean;
}) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(startInEditMode);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState(note.title);
  const [meetingAt, setMeetingAt] = useState(() => toDatetimeLocalValue(note.meetingAt));
  const [lines, setLines] = useState(() => sectionsToLines(note.summarySections));

  function handleCancel() {
    setTitle(note.title);
    setMeetingAt(toDatetimeLocalValue(note.meetingAt));
    setLines(sectionsToLines(note.summarySections));
    setError(null);
    setIsEditing(false);
  }

  async function handleSave() {
    setError(null);
    setIsSubmitting(true);
    const result = await updateMeetingNote(note.id, {
      title,
      meetingAt: new Date(meetingAt).toISOString(),
      sections: linesToSections(lines),
    });
    setIsSubmitting(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    setIsEditing(false);
    router.refresh();
  }

  async function handleDelete() {
    setError(null);
    setIsSubmitting(true);
    const result = await deleteMeetingNote(note.id);
    setIsSubmitting(false);
    if (!result.success) {
      setError(result.error);
      setShowDeleteConfirm(false);
      return;
    }
    router.push("/meeting-notes");
  }

  return (
    <div className="rounded-lg border border-neutral-200 bg-neutral-0 p-6">
      <div className="flex items-start justify-between gap-4">
        {isEditing ? (
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full max-w-md rounded-md border border-neutral-200 bg-neutral-0 px-3 py-2 text-lg text-neutral-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
          />
        ) : (
          <h2 className="text-lg text-neutral-900">{note.title}</h2>
        )}
        <div className="flex shrink-0 items-center gap-2">
          <span className="rounded-sm bg-accent-50 px-2 py-0.5 text-xs text-accent-600">AI自動生成</span>
          {canEdit && !isEditing && (
            <>
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="rounded-md border border-neutral-200 px-3 py-1.5 text-sm text-neutral-600 hover:bg-page-bg"
              >
                編集
              </button>
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="rounded-md border border-danger-text px-3 py-1.5 text-sm text-danger-text hover:bg-danger-bg"
              >
                削除
              </button>
            </>
          )}
        </div>
      </div>

      {error && <p className="mt-2 text-sm text-danger-text">{error}</p>}

      <p className="mt-1 text-xs text-neutral-600">
        {note.companyName ?? "(企業不明)"} ・{" "}
        {isEditing ? (
          <input
            type="datetime-local"
            value={meetingAt}
            onChange={(e) => setMeetingAt(e.target.value)}
            className="rounded-md border border-neutral-200 bg-neutral-0 px-2 py-1 text-xs text-neutral-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
          />
        ) : (
          formatDateJa(note.meetingAt)
        )}
      </p>
      <p className="mt-1 text-xs text-neutral-600">
        関連:{" "}
        {note.projectId ? (
          <Link href={`/projects/${note.projectNumber}`} className="text-primary-600 hover:underline">
            案件を見る
          </Link>
        ) : note.dealId ? (
          <Link href={`/deals/${note.dealNumber}`} className="text-primary-600 hover:underline">
            商談を見る
          </Link>
        ) : (
          "未紐付け"
        )}
      </p>

      <div className="mt-4">
        <p className="text-xs text-neutral-600">AI要約</p>
        {isEditing ? (
          <div className="mt-2 flex flex-col gap-3">
            {(Object.keys(SUMMARY_SECTION_LABELS) as (keyof SummarySections)[]).map((key) => (
              <label key={key} className="flex flex-col gap-1">
                <span className="text-xs text-neutral-600">{SUMMARY_SECTION_LABELS[key]}(1行1項目)</span>
                <textarea
                  value={lines[key]}
                  onChange={(e) => setLines((prev) => ({ ...prev, [key]: e.target.value }))}
                  rows={3}
                  className="rounded-md border border-neutral-200 bg-neutral-0 px-3 py-2 text-sm text-neutral-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
                />
              </label>
            ))}
          </div>
        ) : note.summarySections ? (
          <SummarySectionList sections={note.summarySections} />
        ) : (
          // 構造化データが無い場合(古いDrive取り込み時代の議事録、または要約作成に
          // 失敗した場合)は平文のai_summaryをそのままフォールバック表示する。
          <p className="mt-1 whitespace-pre-wrap text-sm text-neutral-900">{note.aiSummary}</p>
        )}
      </div>

      {isEditing && (
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={handleSave}
            className="rounded-md bg-primary-500 px-4 py-2 text-sm text-neutral-0 disabled:opacity-40"
          >
            保存
          </button>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={handleCancel}
            className="rounded-md border border-neutral-200 px-4 py-2 text-sm text-neutral-600 hover:bg-page-bg disabled:opacity-40"
          >
            キャンセル
          </button>
        </div>
      )}

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        title="議事録を削除しますか?"
        message="この操作は取り消せません。文字起こし・AI要約・アクションアイテムもすべて削除されます。"
        confirmLabel="削除する"
        cancelLabel="キャンセル"
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </div>
  );
}
