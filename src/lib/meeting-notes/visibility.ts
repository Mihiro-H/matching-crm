import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { CurrentUser } from "@/lib/auth/current-user";

/**
 * 議事録の閲覧範囲(SCREEN_SPEC.md 6章「権限」: 管理者以外は自分が担当している
 * 商談・案件の議事録しか見られない)。
 * admin: 全件。それ以外: 自分がproject_assigneesの案件、または自分が商談の
 * 主担当(assigned_user_id)もしくはサブ担当(deal_assignees)の商談に紐づく議事録のみ。
 */
export type MeetingNoteVisibility =
  | { scope: "all" }
  | { scope: "assigned"; projectIds: string[]; dealIds: string[] };

export async function getMeetingNoteVisibility(currentUser: CurrentUser): Promise<MeetingNoteVisibility> {
  if (currentUser.role === "admin") return { scope: "all" };

  const supabase = await createSupabaseServerClient();
  const [{ data: assignedProjects }, { data: primaryDeals }, { data: secondaryDeals }] = await Promise.all([
    supabase.from("project_assignees").select("project_id").eq("user_id", currentUser.id),
    supabase.from("deals").select("id").eq("assigned_user_id", currentUser.id),
    supabase.from("deal_assignees").select("deal_id").eq("user_id", currentUser.id),
  ]);

  const dealIds = new Set<string>();
  for (const row of primaryDeals ?? []) dealIds.add(row.id);
  for (const row of secondaryDeals ?? []) dealIds.add(row.deal_id);

  return {
    scope: "assigned",
    projectIds: (assignedProjects ?? []).map((row) => row.project_id),
    dealIds: [...dealIds],
  };
}

/** 議事録1件がこの閲覧範囲で見えるかどうか(詳細ページ用)。 */
export function isMeetingNoteVisible(
  visibility: MeetingNoteVisibility,
  note: { projectId: string | null; dealId: string | null }
): boolean {
  if (visibility.scope === "all") return true;
  return (
    (note.projectId !== null && visibility.projectIds.includes(note.projectId)) ||
    (note.dealId !== null && visibility.dealIds.includes(note.dealId))
  );
}
