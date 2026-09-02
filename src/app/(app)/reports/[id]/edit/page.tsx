import { notFound, redirect } from "next/navigation";
import { getReportById } from "@/lib/reports/get-report";
import { ReportForm } from "@/components/reports/report-form";
import { requirePageAccess } from "@/lib/auth/page-access";

export default async function ReportEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { canEdit } = await requirePageAccess("reports");
  if (!canEdit) {
    // SCREEN_SPEC.md 8章「権限」: viewは編集不可(閲覧・実行履歴の確認のみ)
    redirect(`/reports/${id}/runs`);
  }

  const report = await getReportById(id);
  if (!report) {
    notFound();
  }

  return <ReportForm existing={report} />;
}
