"use client";

import { useState } from "react";
import { formatDateJa } from "@/lib/format";
import type { ReportRunRow } from "@/lib/reports/get-report";

const STATUS_LABELS = { success: "成功", failed: "失敗" } as const;

export function ReportRunsList({ runs }: { runs: ReportRunRow[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (runs.length === 0) {
    return <p className="text-sm text-neutral-600">まだ実行履歴はありません。</p>;
  }

  return (
    <ul className="flex flex-col gap-2">
      {runs.map((run) => (
        <li key={run.id} className="rounded-lg border border-neutral-200 bg-neutral-0 p-4">
          <button
            type="button"
            onClick={() => setExpandedId((prev) => (prev === run.id ? null : run.id))}
            className="flex w-full items-center justify-between text-left text-sm"
          >
            <span className={run.status === "success" ? "text-success-text" : "text-danger-text"}>
              {STATUS_LABELS[run.status]}
            </span>
            <span className="text-xs text-neutral-600">{formatDateJa(run.generated_at)}</span>
          </button>
          {run.error_message && <p className="mt-1 text-xs text-danger-text">{run.error_message}</p>}
          {expandedId === run.id && (
            <pre className="mt-2 overflow-x-auto rounded-md bg-page-bg p-3 text-xs text-neutral-600">
              {JSON.stringify(run.result_snapshot, null, 2)}
            </pre>
          )}
        </li>
      ))}
    </ul>
  );
}
