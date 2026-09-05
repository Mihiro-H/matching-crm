import { createSupabaseServerClient } from "@/lib/supabase/server";

export type DealSecondaryAssignee = { id: string; userId: string; name: string };

/**
 * 商談のサブ担当一覧(SCREEN_SPEC.md「商談管理」)。
 * 主担当はdeals.assigned_user_id(DealDetail.assigneeName)で別途表示済みのため、
 * ここではdeal_assigneesのサブ担当のみを返す。
 */
export async function getDealSecondaryAssignees(dealId: string): Promise<DealSecondaryAssignee[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("deal_assignees")
    .select("id, user:users(id, name)")
    .eq("deal_id", dealId)
    .order("created_at");

  if (error) return [];

  return (data ?? [])
    .filter((row) => row.user !== null)
    .map((row) => ({ id: row.id, userId: row.user!.id, name: row.user!.name }));
}
