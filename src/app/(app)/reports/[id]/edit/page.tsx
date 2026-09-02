import { notFound } from "next/navigation";
import { getReportById } from "@/lib/reports/get-report";
import { ReportForm } from "@/components/reports/report-form";

export default async function ReportEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const report = await getReportById(id);
  if (!report) {
    notFound();
  }

  return <ReportForm existing={report} />;
}
