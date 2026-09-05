"use client";

import { useState } from "react";

/**
 * 文字起こし全文の折りたたみ表示(SCREEN_SPEC.md 6章「AI要約」)。
 * AI要約(要点/決議事項/ネクストアクション)を主役にするため、全文はデフォルト非表示にし、
 * 必要なときだけ開けるようにする。
 */
export function TranscriptToggle({ transcriptText }: { transcriptText: string }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div>
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        className="text-sm text-primary-600 hover:underline"
      >
        {isOpen ? "▲ 文字起こし" : "▼ 文字起こし"}
      </button>
      {isOpen && (
        <p className="mt-2 whitespace-pre-wrap text-sm text-neutral-900">{transcriptText}</p>
      )}
    </div>
  );
}
