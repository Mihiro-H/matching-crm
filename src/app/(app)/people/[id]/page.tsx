import { redirect } from "next/navigation";

// 詳細画面のデフォルトタブは「商談一覧」(唯一のタブ、SCREEN_SPEC.md「担当者一覧」)
export default async function PersonDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/people/${id}/deals`);
}
