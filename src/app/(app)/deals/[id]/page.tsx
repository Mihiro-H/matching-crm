import { redirect } from "next/navigation";

// 詳細画面のデフォルトタブは「議事録」(唯一のタブ、SCREEN_SPEC.md「商談管理」)
export default async function DealDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/deals/${id}/meeting-notes`);
}
