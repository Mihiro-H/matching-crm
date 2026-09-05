import { notFound } from "next/navigation";
import { getLatestReportRun, getReportById } from "@/lib/reports/get-report";
import { REPORT_METRIC_OPTIONS } from "@/lib/reports/metrics";
import { computeReportPeriod, formatReportPeriodLabel } from "@/lib/reports/report-period";
import { ReportMetricCard } from "@/components/reports/report-metric-card";
import { ReportPrintTrigger } from "@/components/reports/report-print-trigger";
import { requirePageAccess } from "@/lib/auth/page-access";
import { formatDateTimeJa } from "@/lib/format";
import type { Json } from "@/lib/supabase/database.types";

/**
 * レポート印刷用ページ(SCREEN_SPEC.md 8章「ダウンロード」のPDF代替)。
 * (app)配下のSideNav/Header/タブナビを一切持たない、印刷専用のシンプルな見た目にするため
 * あえて/(app)route groupの外に置いている。マウント時にwindow.print()を呼び出す
 * (ブラウザの印刷ダイアログで「PDFに保存」を選べば実質PDFダウンロードになる。
 * jsPDF等での自前PDF生成は日本語フォント埋め込みが別途必要なため、この方式で代替する)。
 */
export default async function ReportPrintPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requirePageAccess("reports");

  const report = await getReportById(id);
  if (!report) {
    notFound();
  }

  const latestRun = await getLatestReportRun(id);
  const metricDefs = REPORT_METRIC_OPTIONS.filter((option) => report.metrics.includes(option.key));
  const resultSnapshot = (latestRun?.result_snapshot as Record<string, Json>) ?? {};
  const periodLabel =
    latestRun && report.schedule
      ? formatReportPeriodLabel(
          computeReportPeriod(report.schedule.frequency, new Date(latestRun.generated_at)),
          report.schedule.frequency
        )
      : "-";
  const generatedAtLabel = latestRun ? formatDateTimeJa(latestRun.generated_at) : "未実行";

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4 p-8">
      <ReportPrintTrigger ready={latestRun !== null} />
      <div>
        <h1 className="text-xl text-neutral-900">{report.name}</h1>
        <p className="mt-1 text-sm text-neutral-600">
          対象期間: {periodLabel} ・ 最終生成日時: {generatedAtLabel}
        </p>
      </div>

      {!latestRun && <p className="text-sm text-neutral-600">まだ実行されていません。</p>}

      {latestRun &&
        metricDefs.map((def) => (
          <ReportMetricCard
            key={def.key}
            metricKey={def.key}
            label={def.label}
            value={resultSnapshot[def.key] ?? null}
          />
        ))}
    </div>
  );
}
