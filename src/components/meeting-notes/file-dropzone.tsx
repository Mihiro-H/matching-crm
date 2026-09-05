"use client";

import { useRef, useState } from "react";
import { CloudUpload } from "lucide-react";

// next.config.tsのserverActions.bodySizeLimit/proxyClientMaxBodySizeと合わせる
// (実際に設定している上限を表示する。案内と実挙動がずれないようにするため)。
const MAX_FILE_SIZE_MB = 300;
const BYTES_PER_MB = 1024 * 1024;

/**
 * 音声/動画ファイルのドラッグ&ドロップアップロード欄(デザイン指定あり)。
 * クリックでのファイル選択にも対応する(隠したinput[type=file]をrefで開く)。
 */
export function FileDropzone({
  file,
  onFileChange,
}: {
  file: File | null;
  onFileChange: (file: File | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function acceptFile(candidate: File | null) {
    setError(null);
    if (!candidate) return;
    if (candidate.size > MAX_FILE_SIZE_MB * BYTES_PER_MB) {
      setError(`ファイルサイズが大きすぎます(上限${MAX_FILE_SIZE_MB}MB)。`);
      return;
    }
    onFileChange(candidate);
  }

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDraggingOver(true);
        }}
        onDragLeave={() => setIsDraggingOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDraggingOver(false);
          acceptFile(e.dataTransfer.files?.[0] ?? null);
        }}
        className={`flex cursor-pointer flex-col items-center gap-3 rounded-lg border-2 border-dashed px-6 py-10 text-center transition-colors ${
          isDraggingOver ? "border-primary-500 bg-primary-50" : "border-neutral-200 bg-page-bg"
        }`}
      >
        <CloudUpload className="text-primary-500" size={40} strokeWidth={1.5} />
        <p className="text-sm text-neutral-900">
          音声/動画ファイルをここにドラッグ、または{" "}
          <span className="text-success-text underline underline-offset-2">ファイルを選択</span>
        </p>
        <p className="text-xs text-neutral-600">
          アップロード可能な最大サイズ: {MAX_FILE_SIZE_MB}MBまで
        </p>
        {file && <p className="text-xs text-neutral-900">選択中: {file.name}</p>}
      </div>
      {error && <p className="mt-2 text-xs text-danger-text">{error}</p>}

      <input
        ref={inputRef}
        type="file"
        accept="audio/*,video/*"
        onChange={(e) => acceptFile(e.target.files?.[0] ?? null)}
        className="hidden"
      />
    </div>
  );
}
