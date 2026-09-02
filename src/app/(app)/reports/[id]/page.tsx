import { redirect } from "next/navigation";
import { requirePageAccess } from "@/lib/auth/page-access";
import { isSupabaseConfigured } from "@/lib/supabase/server";

// デフォルトタブはedit(編集可能な場合)、閲覧のみのユーザーは実行履歴タブへ
// (SCREEN_SPEC.md 8章「権限」: viewは閲覧・実行履歴の確認のみ)。
export default async function ReportDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  if (!isSupabaseConfigured()) {
    redirect(`/reports/${id}/edit`);
  }

  const { canEdit } = await requirePageAccess("reports");
  redirect(`/reports/${id}/${canEdit ? "edit" : "runs"}`);
}
