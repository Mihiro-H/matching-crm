import { redirect } from "next/navigation";

// 詳細画面のデフォルトタブは「案件」(SCREEN_SPEC.md 3章)
export default async function CompanyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/companies/${id}/projects`);
}
