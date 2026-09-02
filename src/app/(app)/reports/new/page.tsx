import { redirect } from "next/navigation";
import { ReportForm } from "@/components/reports/report-form";
import { requirePageAccess } from "@/lib/auth/page-access";

export default async function NewReportPage() {
  const { canEdit } = await requirePageAccess("reports");
  if (!canEdit) {
    redirect("/reports");
  }

  return <ReportForm existing={null} />;
}
