import { notFound } from "next/navigation";
import { getLatestReportRun, getReportById } from "@/lib/reports/get-report";
import { REPORT_METRIC_OPTIONS } from "@/lib/reports/metrics";
import { ReportView } from "@/components/reports/report-view";
import { requirePageAccess } from "@/lib/auth/page-access";
import type { Json } from "@/lib/supabase/database.types";

/** レポート表示画面(SCREEN_SPEC.md 8章)。一覧からレポート名をクリックした際のメイン画面。 */
export default async function ReportViewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { canEdit } = await requirePageAccess("reports");

  const report = await getReportById(id);
  if (!report) {
    notFound();
  }

  const latestRun = await getLatestReportRun(id);
  const metricDefs = REPORT_METRIC_OPTIONS.filter((option) => report.metrics.includes(option.key));

  return (
    <ReportView
      reportId={id}
      reportName={report.name}
      metricDefs={metricDefs}
      frequency={report.schedule?.frequency ?? null}
      canEdit={canEdit}
      latestRun={
        latestRun
          ? {
              generatedAt: latestRun.generated_at,
              status: latestRun.status,
              resultSnapshot: (latestRun.result_snapshot as Record<string, Json>) ?? {},
              errorMessage: latestRun.error_message,
            }
          : null
      }
    />
  );
}
