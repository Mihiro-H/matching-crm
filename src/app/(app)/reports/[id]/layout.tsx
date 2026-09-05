import { notFound } from "next/navigation";
import { getReportById } from "@/lib/reports/get-report";
import { ReportDetailShell } from "@/components/reports/report-detail-shell";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { requirePageAccess } from "@/lib/auth/page-access";
import { SupabaseNotConfiguredNotice } from "@/components/ui/supabase-not-configured-notice";

export default async function ReportDetailLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  if (!isSupabaseConfigured()) {
    // childrenをそのまま返すと、配下のタブページが未接続のままデータ取得を
    // 試みて例外を投げてしまうため、ここで止めて案内のみ表示する。
    return <SupabaseNotConfiguredNotice />;
  }

  // hidden権限のユーザーをnotFound()にする、共通の権限ゲート
  // (表示/編集/実行履歴の各ページはこのレイアウト配下のため、ここで一括判定する)。
  await requirePageAccess("reports");

  const report = await getReportById(id);
  if (!report) {
    notFound();
  }

  return <ReportDetailShell reportId={id}>{children}</ReportDetailShell>;
}
