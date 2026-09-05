"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Download } from "lucide-react";
import { runReportNow } from "@/lib/reports/actions";
import { buildReportCsv, type ReportExportMetric } from "@/lib/reports/export";
import { computeReportPeriod, formatReportPeriodLabel } from "@/lib/reports/report-period";
import { ReportMetricCard } from "./report-metric-card";
import { formatDateTimeJa } from "@/lib/format";
import type { ReportMetricKey } from "@/lib/reports/metrics";
import type { Json, ReportFrequency, ReportRunStatus } from "@/lib/supabase/database.types";

export type ReportViewLatestRun = {
  generatedAt: string;
  status: ReportRunStatus;
  resultSnapshot: Record<string, Json>;
  errorMessage: string | null;
};

function downloadTextFile(content: string, fileName: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * レポート表示画面(SCREEN_SPEC.md 8章)。一覧からレポート名をクリックした際の
 * メイン画面。直近の実行結果(latestRun)を「対象期間」「最終生成日時」付きで表示し、
 * 「今すぐ実行」で再生成、「ダウンロード」でCSV or 印刷(PDF代替)を選べる。
 */
export function ReportView({
  reportId,
  reportName,
  metricDefs,
  frequency,
  canEdit,
  latestRun,
}: {
  reportId: string;
  reportName: string;
  metricDefs: { key: ReportMetricKey; label: string }[];
  frequency: ReportFrequency | null;
  canEdit: boolean;
  latestRun: ReportViewLatestRun | null;
}) {
  const router = useRouter();
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showDownloadMenu) return;
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setShowDownloadMenu(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showDownloadMenu]);

  const periodLabel =
    latestRun && frequency
      ? formatReportPeriodLabel(computeReportPeriod(frequency, new Date(latestRun.generatedAt)), frequency)
      : "-";
  const generatedAtLabel = latestRun ? formatDateTimeJa(latestRun.generatedAt) : "未実行";

  async function handleRunNow() {
    setIsRunning(true);
    setError(null);
    const result = await runReportNow(reportId);
    setIsRunning(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  function buildExportMetrics(): ReportExportMetric[] {
    return metricDefs.map((def) => ({
      key: def.key,
      label: def.label,
      value: latestRun?.resultSnapshot[def.key] ?? null,
    }));
  }

  function handleDownloadCsv() {
    setShowDownloadMenu(false);
    const csv = buildReportCsv({
      reportName,
      periodLabel,
      generatedAtLabel,
      metrics: buildExportMetrics(),
    });
    // 先頭にBOMを付け、Excelで開いた際も文字化けしないようにする。
    downloadTextFile("\uFEFF" + csv, `${reportName}.csv`, "text/csv;charset=utf-8");
  }

  function handleDownloadPdf() {
    setShowDownloadMenu(false);
    // PDFはjsPDF等での自前生成だと日本語フォントの埋め込みが別途必要になるため、
    // ブラウザの印刷機能(印刷用ページ+自動でprint()を呼ぶ)で代替する。
    window.open(`/print/reports/${reportId}`, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-lg border border-neutral-200 bg-neutral-0 p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-lg text-neutral-900">{reportName}</h2>
            <p className="mt-1 text-sm text-neutral-600">
              対象期間: {periodLabel} ・ 最終生成日時: {generatedAtLabel}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {canEdit && (
              <button
                type="button"
                disabled={isRunning}
                onClick={() => void handleRunNow()}
                className="rounded-md border border-neutral-200 px-3 py-1.5 text-sm text-neutral-600 hover:bg-page-bg disabled:opacity-40"
              >
                {isRunning ? "実行中..." : "今すぐ実行"}
              </button>
            )}
            <div ref={menuRef} className="relative">
              <button
                type="button"
                disabled={!latestRun}
                onClick={() => setShowDownloadMenu((v) => !v)}
                className="flex items-center gap-1 rounded-md bg-primary-500 px-3 py-1.5 text-sm text-neutral-0 disabled:opacity-40"
              >
                <Download size={14} />
                ダウンロード
              </button>
              {showDownloadMenu && (
                <div className="absolute right-0 top-full z-10 mt-1 w-40 rounded-md border border-neutral-200 bg-neutral-0 py-1 shadow-md">
                  <button
                    type="button"
                    onClick={handleDownloadPdf}
                    className="block w-full px-3 py-1.5 text-left text-sm text-neutral-900 hover:bg-page-bg"
                  >
                    PDF
                  </button>
                  <button
                    type="button"
                    onClick={handleDownloadCsv}
                    className="block w-full px-3 py-1.5 text-left text-sm text-neutral-900 hover:bg-page-bg"
                  >
                    CSV
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {error && <p className="mt-3 text-sm text-danger-text">{error}</p>}
        {latestRun?.status === "failed" && (
          <p className="mt-3 text-sm text-danger-text">
            直近の実行に失敗しています: {latestRun.errorMessage ?? "不明なエラー"}
          </p>
        )}
      </div>

      {!latestRun && (
        <div className="rounded-lg border border-neutral-200 bg-neutral-0 p-8 text-center text-sm text-neutral-600">
          まだ実行されていません。
          {canEdit ? "「今すぐ実行」からレポートを作成してください。" : "編集権限のあるユーザーに作成を依頼してください。"}
        </div>
      )}

      {latestRun && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {metricDefs.map((def) => (
            <ReportMetricCard
              key={def.key}
              metricKey={def.key}
              label={def.label}
              value={latestRun.resultSnapshot[def.key] ?? null}
            />
          ))}
        </div>
      )}
    </div>
  );
}
