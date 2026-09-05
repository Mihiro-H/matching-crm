"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { SearchSelectModal, type SearchResultItem } from "@/components/ui/search-select-modal";
import { FileDropzone } from "@/components/meeting-notes/file-dropzone";
import { searchDeals, searchProjects } from "@/lib/search-select/actions";
import { checkMeetingNoteUploadStatus, submitMeetingRecordingUpload } from "@/lib/meeting-notes/upload-actions";

const POLL_INTERVAL_MS = 5000;
// この時間を超えてもまだ処理中の場合、「待たせすぎている」と判断して
// 通知ベースの案内に切り替える(SCREEN_SPEC.md 6章「時間がかかる場合の案内」)。
const LONG_WAIT_MS = 45000;

type RelatedKind = "project" | "deal";

/**
 * 議事録アップロード(SCREEN_SPEC.md 6章)。音声/動画ファイル+関連する商談または
 * 案件を選び、AssemblyAIでの文字起こし・要約が完了するまでポーリングして待つ。
 * (Vercel Hobbyのcron1日1回制約を避けるため、旧Drive取り込みのようなcron待ちではなく
 * クライアント側での短い間隔のポーリングで完了を確認する設計にしている)
 * ポーリングはあくまで「画面を開いたままの場合の即時反映」用で、45秒を超えても
 * 終わらない場合は「通知でお知らせします」という案内に切り替え、画面を離れても
 * 問題ないことを伝える(完了/失敗の検知自体はAssemblyAI Webhook経由でも行われ、
 * 実際にmeeting_note_ready/meeting_note_failed通知が届く。complete-upload.ts参照)。
 */
export function MeetingNoteUploadForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [meetingAt, setMeetingAt] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [related, setRelated] = useState<{ kind: RelatedKind; item: SearchResultItem } | null>(null);
  const [showModal, setShowModal] = useState<RelatedKind | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [processingState, setProcessingState] = useState<"idle" | "processing" | "failed">("idle");
  const [isTakingLong, setIsTakingLong] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const longWaitTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (pollTimer.current) clearInterval(pollTimer.current);
      if (longWaitTimer.current) clearTimeout(longWaitTimer.current);
    };
  }, []);

  function stopWaiting() {
    if (pollTimer.current) clearInterval(pollTimer.current);
    if (longWaitTimer.current) clearTimeout(longWaitTimer.current);
  }

  function startPolling(uploadId: string) {
    pollTimer.current = setInterval(async () => {
      const result = await checkMeetingNoteUploadStatus(uploadId);
      if (result.status === "processing") return;

      stopWaiting();
      if (result.status === "failed") {
        setProcessingState("failed");
        setError(result.error);
        return;
      }
      router.push(`/meeting-notes/${result.meetingNoteId}`);
    }, POLL_INTERVAL_MS);
    longWaitTimer.current = setTimeout(() => setIsTakingLong(true), LONG_WAIT_MS);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsTakingLong(false); // 前回失敗して再送する場合に、待機表示が最初から「時間切れ」扱いにならないようにする

    if (!title.trim()) return setError("タイトルを入力してください。");
    if (!meetingAt) return setError("会議日時を入力してください。");
    if (!related) return setError("関連する商談または案件を選択してください。");
    if (!file) return setError("音声または動画ファイルを選択してください。");

    const formData = new FormData();
    formData.set("title", title);
    formData.set("meetingAt", new Date(meetingAt).toISOString());
    formData.set(related.kind === "project" ? "projectId" : "dealId", related.item.id);
    formData.set("file", file);

    setIsSubmitting(true);
    try {
      const result = await submitMeetingRecordingUpload(formData);
      if (!result.success) {
        setError(result.error);
        return;
      }
      setProcessingState("processing");
      startPolling(result.uploadId);
    } catch {
      // ネットワーク瞬断やサーバー側のタイムアウトなどでリクエスト自体が失敗した場合。
      // ここでcatchしないと「送信中...」のまま固まって見えてしまう(実際に起きた不具合)。
      setError("送信に失敗しました。通信環境をご確認のうえ、もう一度お試しください。");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (processingState === "processing") {
    return (
      <div className="rounded-lg border border-neutral-200 bg-neutral-0 p-8 text-center">
        <p className="text-sm text-neutral-900">文字起こし・要約を作成しています…</p>
        {isTakingLong ? (
          <p className="mt-1 text-xs text-neutral-600">
            送信を受け付けました。作成され次第、通知でお知らせします。このページを閉じても問題ありません。
          </p>
        ) : (
          <p className="mt-1 text-xs text-neutral-600">
            完了まで数分かかる場合があります。このままお待ちください(自動的に切り替わります)。
          </p>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border border-neutral-200 bg-neutral-0 p-6">
      {error && <p className="mb-3 text-sm text-danger-text">{error}</p>}
      {processingState === "failed" && (
        <p className="mb-3 text-xs text-neutral-600">アップロードし直すか、時間を置いて再度お試しください。</p>
      )}

      <div className="flex flex-col gap-4">
        <label className="flex flex-col gap-1">
          <span className="text-xs text-neutral-600">タイトル</span>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-96 rounded-md border border-neutral-200 bg-neutral-0 px-3 py-2 text-sm text-neutral-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs text-neutral-600">会議日時</span>
          <input
            type="datetime-local"
            value={meetingAt}
            onChange={(e) => setMeetingAt(e.target.value)}
            className="w-64 rounded-md border border-neutral-200 bg-neutral-0 px-3 py-2 text-sm text-neutral-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs text-neutral-600">音声または動画ファイル</span>
          <FileDropzone file={file} onFileChange={setFile} />
        </label>

        <div>
          <p className="text-xs text-neutral-600">関連する商談または案件</p>
          <div className="mt-1 flex items-center gap-2">
            <span className="text-sm text-neutral-900">
              {related ? `${related.kind === "project" ? "案件" : "商談"}: ${related.item.label}` : "未選択"}
            </span>
            <button
              type="button"
              onClick={() => setShowModal("deal")}
              className="text-xs text-success-text underline underline-offset-2"
            >
              商談を選択
            </button>
            <button
              type="button"
              onClick={() => setShowModal("project")}
              className="text-xs text-success-text underline underline-offset-2"
            >
              案件を選択
            </button>
            {related && (
              <button
                type="button"
                onClick={() => setRelated(null)}
                className="text-xs text-success-text underline underline-offset-2"
              >
                選択解除
              </button>
            )}
          </div>
        </div>
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="mt-6 rounded-md bg-primary-500 px-4 py-2 text-sm text-neutral-0 disabled:opacity-40"
      >
        {isSubmitting ? "送信中..." : "アップロード"}
      </button>

      <SearchSelectModal
        isOpen={showModal === "deal"}
        onClose={() => setShowModal(null)}
        title="商談を選択"
        placeholder="担当者名で検索"
        mode="single"
        search={searchDeals}
        onConfirm={(items) => {
          const [item] = items;
          if (item) setRelated({ kind: "deal", item });
        }}
      />
      <SearchSelectModal
        isOpen={showModal === "project"}
        onClose={() => setShowModal(null)}
        title="案件を選択"
        placeholder="案件名で検索"
        mode="single"
        search={searchProjects}
        onConfirm={(items) => {
          const [item] = items;
          if (item) setRelated({ kind: "project", item });
        }}
      />
    </form>
  );
}
