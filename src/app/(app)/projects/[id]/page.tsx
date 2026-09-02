import { redirect } from "next/navigation";

// 詳細画面のデフォルトタブは「見積・契約」
export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/projects/${id}/estimates`);
}
