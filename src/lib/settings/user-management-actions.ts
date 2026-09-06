"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/require-admin";

export type MutationResult = { success: true } | { success: false; error: string };

/**
 * ユーザー管理(SCREEN_SPEC.md 10章 9-2)での氏名・部署・Slack IDの編集。
 * メールアドレスはauth.usersと紐づくログイン用の識別子のため、ここでは変更不可。
 * Slack IDはSlack通知本文の{{mentions}}プレースホルダーで、そのイベントの通知対象
 * ユーザーへのメンションに使う(slack/notify.ts参照)。ワークスペースのメンバーIDを
 * 入力する(表示名ではなくSlackの内部ID。例: U0123ABCDEF)。
 */
export async function updateUserDetails(
  userId: string,
  input: { name: string; departmentId: string | null; slackUserId: string | null }
): Promise<MutationResult> {
  const authCheck = await requireAdmin();
  if (!authCheck.ok) return { success: false, error: authCheck.error };

  if (!input.name.trim()) {
    return { success: false, error: "氏名を入力してください。" };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("users")
    .update({
      name: input.name.trim(),
      department_id: input.departmentId,
      slack_user_id: input.slackUserId?.trim() || null,
    })
    .eq("id", userId);

  if (error) return { success: false, error: error.message };

  revalidatePath("/settings");
  return { success: true };
}

/**
 * 「新規問い合わせ」通知(ヘッダーのベル)の宛先となる、案件振り分け担当者の指定を切り替える
 * (notify.ts: resolveNotificationRecipients参照)。
 */
export async function setLeadDistributor(userId: string, isLeadDistributor: boolean): Promise<MutationResult> {
  const authCheck = await requireAdmin();
  if (!authCheck.ok) return { success: false, error: authCheck.error };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("users")
    .update({ is_lead_distributor: isLeadDistributor })
    .eq("id", userId);

  if (error) return { success: false, error: error.message };

  revalidatePath("/settings");
  return { success: true };
}

/**
 * ユーザーのアーカイブ(退職等)。物理削除せずis_archivedフラグを立てるのみなので、
 * 過去のアサイン履歴(project_assignees等)はそのまま残る。
 * 以後は担当者アサインの候補に出さない(searchAssignableUsers参照)ため、
 * 新規問い合わせ通知の宛先からも外れるよう案件振り分け担当者フラグも合わせて解除する。
 */
export async function archiveUser(userId: string): Promise<MutationResult> {
  const authCheck = await requireAdmin();
  if (!authCheck.ok) return { success: false, error: authCheck.error };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("users")
    .update({ is_archived: true, is_lead_distributor: false })
    .eq("id", userId);

  if (error) return { success: false, error: error.message };

  revalidatePath("/settings");
  return { success: true };
}

/** アーカイブ解除(復帰)。担当者アサインの候補に再び出るようになる。 */
export async function unarchiveUser(userId: string): Promise<MutationResult> {
  const authCheck = await requireAdmin();
  if (!authCheck.ok) return { success: false, error: authCheck.error };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("users").update({ is_archived: false }).eq("id", userId);

  if (error) return { success: false, error: error.message };

  revalidatePath("/settings");
  return { success: true };
}
