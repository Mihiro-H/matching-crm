import { notFound } from "next/navigation";
import { getReportById } from "@/lib/reports/get-report";
import { ReportDetailShell } from "@/components/reports/report-detail-shell";
import { isSupabaseConfigured } from "@/lib/supabase/server";

export default async function ReportDetailLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  if (!isSupabaseConfigured()) {
    return children;
  }

  const report = await getReportById(id);
  if (!report) {
    notFound();
  }

  return <ReportDetailShell reportId={id}>{children}</ReportDetailShell>;
}
