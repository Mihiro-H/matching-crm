import { getReportRuns } from "@/lib/reports/get-report";
import { ReportRunsList } from "@/components/reports/report-runs-list";

export default async function ReportRunsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { runs, error } = await getReportRuns(id);

  if (error) {
    return <p className="text-sm text-danger-text">実行履歴の取得に失敗しました: {error}</p>;
  }

  return <ReportRunsList runs={runs} />;
}
