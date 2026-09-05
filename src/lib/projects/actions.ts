"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireEditAccess } from "@/lib/auth/require-edit";
import type { ProjectStatus } from "@/lib/supabase/database.types";
import { isManualDropAllowed } from "./status-transitions";
import type { JobCategory } from "@/lib/supabase/database.types";

export type UpdateProjectStatusResult = { success: true } | { success: false; error: string };

/**
 * カンバンビュー(SCREEN_SPEC.md 4章)でのドラッグ&ドロップによる手動ステータス変更。
 * `contracted` への手動遷移はクラウドサインWebhook経由専用のためサーバー側でも拒否する
 * (UI側のグレーアウトを迂回されても安全なように)。
 * view権限のユーザーはこの操作を行えない(SCREEN_SPEC.md「権限」)。
 */
export async function updateProjectStatus(
  projectId: string,
  newStatus: ProjectStatus
): Promise<UpdateProjectStatusResult> {
  const authCheck = await requireEditAccess("projects");
  if (!authCheck.ok) return { success: false, error: authCheck.error };

  if (!isManualDropAllowed(newStatus)) {
    return {
      success: false,
      error: "「契約済」への変更はクラウドサイン連携によって自動的に行われます。手動では変更できません。",
    };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("projects")
    .update({ status: newStatus })
    .eq("id", projectId);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/projects");
  return { success: true };
}

export type MutationResult = { success: true } | { success: false; error: string };
export type CreateProjectResult = { success: true; id: string; number: number } | { success: false; error: string };

/**
 * 案件管理一覧の「+新規作成」(SCREEN_SPEC.md 4章)。
 * 「契約済」への遷移はクラウドサインWebhook専用のため、新規作成時のステータスも
 * updateProjectDetailsと同様にそこへは直接設定できないようガードする。
 * 企業担当者(contact)・主担当・サブ担当もこの画面で登録できる(いずれも任意。
 * 後から詳細ページでも変更可能)。
 */
export async function createProject(input: {
  companyId: string;
  contactId: string | null;
  title: string;
  budget: number | null;
  startDate: string | null;
  endDate: string | null;
  status: ProjectStatus;
  primaryAssigneeId: string | null;
  secondaryAssigneeIds: string[];
}): Promise<CreateProjectResult> {
  const authCheck = await requireEditAccess("projects");
  if (!authCheck.ok) return { success: false, error: authCheck.error };

  if (!input.companyId) {
    return { success: false, error: "企業を選択してください。" };
  }
  if (!input.title.trim()) {
    return { success: false, error: "案件名を入力してください。" };
  }
  if (input.startDate && input.endDate && input.startDate > input.endDate) {
    return { success: false, error: "開始日は終了日より前の日付にしてください。" };
  }
  if (!isManualDropAllowed(input.status)) {
    return {
      success: false,
      error: "「契約済」はクラウドサイン連携によって自動的に設定されます。新規作成時には選択できません。",
    };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("projects")
    .insert({
      company_id: input.companyId,
      contact_id: input.contactId,
      title: input.title.trim(),
      budget: input.budget,
      start_date: input.startDate,
      end_date: input.endDate,
      status: input.status,
    })
    .select("id, number")
    .single();

  if (error) return { success: false, error: error.message };

  const assigneeRows: { project_id: string; user_id: string; role: "primary" | "secondary" }[] = [];
  if (input.primaryAssigneeId) {
    assigneeRows.push({ project_id: data.id, user_id: input.primaryAssigneeId, role: "primary" });
  }
  for (const userId of input.secondaryAssigneeIds) {
    if (userId === input.primaryAssigneeId) continue;
    assigneeRows.push({ project_id: data.id, user_id: userId, role: "secondary" });
  }
  if (assigneeRows.length > 0) {
    await supabase.from("project_assignees").insert(assigneeRows);
  }

  revalidatePath("/projects");
  return { success: true, id: data.id, number: data.number };
}

/**
 * 案件詳細ヘッダーの基本項目編集(案件名/金額/納期/ステータス)。
 * `contracted`への変更はupdateProjectStatusと同様にクラウドサインWebhook専用のため
 * ここでも拒否する(手動フォームを経由しても迂回できないようにする)。ただし既に
 * contractedの案件で他の項目だけ編集する場合(ステータス自体は変えない)は許可する。
 */
export async function updateProjectDetails(
  projectId: string,
  input: {
    title: string;
    budget: number | null;
    startDate: string | null;
    endDate: string | null;
    status: ProjectStatus;
  }
): Promise<MutationResult> {
  const authCheck = await requireEditAccess("projects");
  if (!authCheck.ok) return { success: false, error: authCheck.error };

  if (!input.title.trim()) {
    return { success: false, error: "案件名を入力してください。" };
  }
  if (input.startDate && input.endDate && input.startDate > input.endDate) {
    return { success: false, error: "開始日は終了日より前の日付にしてください。" };
  }

  const supabase = await createSupabaseServerClient();

  const { data: current, error: fetchError } = await supabase
    .from("projects")
    .select("status")
    .eq("id", projectId)
    .maybeSingle();
  if (fetchError) return { success: false, error: fetchError.message };
  if (!current) return { success: false, error: "案件が見つかりません。" };

  const statusChanged = current.status !== input.status;
  if (statusChanged && !isManualDropAllowed(input.status)) {
    return {
      success: false,
      error: "「契約済」への変更はクラウドサイン連携によって自動的に行われます。手動では変更できません。",
    };
  }

  const { error } = await supabase
    .from("projects")
    .update({
      title: input.title.trim(),
      budget: input.budget,
      start_date: input.startDate,
      end_date: input.endDate,
      status: input.status,
    })
    .eq("id", projectId);

  if (error) return { success: false, error: error.message };

  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/projects");
  return { success: true };
}

/**
 * 見積書・納品書・請求書作成画面で金額を修正した際、「案件ページの金額も変更しますか?」
 * の確認後に呼ばれる、案件のbudgetだけを更新する軽量なアクション
 * (updateProjectDetailsは案件名等の必須項目やステータス遷移ガードを伴うため、
 * 金額単体の同期にはここだけを更新する専用アクションを設ける)。
 */
export async function updateProjectBudget(projectId: string, budget: number): Promise<MutationResult> {
  const authCheck = await requireEditAccess("projects");
  if (!authCheck.ok) return { success: false, error: authCheck.error };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("projects").update({ budget }).eq("id", projectId);
  if (error) return { success: false, error: error.message };

  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/projects");
  return { success: true };
}

/**
 * 主担当を変更する(SCREEN_SPEC.md 4章「担当者セクション」)。
 * 既存の主担当がいれば「サブ担当」に降格し、新しい担当者を主担当にする
 * (project_assigneesは(project_id, user_id)がユニークのため、
 * 同一ユーザーが主担当とサブ担当を同時に持つことはできない)。
 */
export async function setPrimaryAssignee(
  projectId: string,
  userId: string
): Promise<MutationResult> {
  const authCheck = await requireEditAccess("projects");
  if (!authCheck.ok) return { success: false, error: authCheck.error };

  const supabase = await createSupabaseServerClient();

  const { data: existing, error: fetchError } = await supabase
    .from("project_assignees")
    .select("id, user_id, role")
    .eq("project_id", projectId);

  if (fetchError) {
    return { success: false, error: fetchError.message };
  }

  const currentPrimary = existing?.find((row) => row.role === "primary");
  if (currentPrimary && currentPrimary.user_id !== userId) {
    const { error } = await supabase
      .from("project_assignees")
      .update({ role: "secondary" })
      .eq("id", currentPrimary.id);
    if (error) return { success: false, error: error.message };
  }

  const existingRowForUser = existing?.find((row) => row.user_id === userId);
  if (existingRowForUser) {
    const { error } = await supabase
      .from("project_assignees")
      .update({ role: "primary" })
      .eq("id", existingRowForUser.id);
    if (error) return { success: false, error: error.message };
  } else {
    const { error } = await supabase
      .from("project_assignees")
      .insert({ project_id: projectId, user_id: userId, role: "primary" });
    if (error) return { success: false, error: error.message };
  }

  revalidatePath(`/projects/${projectId}`);
  return { success: true };
}

/** サブ担当を追加する(SCREEN_SPEC.md 4章「担当者セクション」) */
export async function addSecondaryAssignee(
  projectId: string,
  userId: string
): Promise<MutationResult> {
  const authCheck = await requireEditAccess("projects");
  if (!authCheck.ok) return { success: false, error: authCheck.error };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("project_assignees")
    .insert({ project_id: projectId, user_id: userId, role: "secondary" });

  if (error) {
    const message = error.code === "23505" ? "既にこの案件にアサインされています。" : error.message;
    return { success: false, error: message };
  }

  revalidatePath(`/projects/${projectId}`);
  return { success: true };
}

/** 担当者(主担当/サブ担当)を削除する(SCREEN_SPEC.md 4章「担当者セクション」) */
export async function removeAssignee(
  projectId: string,
  assigneeId: string
): Promise<MutationResult> {
  const authCheck = await requireEditAccess("projects");
  if (!authCheck.ok) return { success: false, error: authCheck.error };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("project_assignees").delete().eq("id", assigneeId);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath(`/projects/${projectId}`);
  return { success: true };
}

export type AddProjectRoleResult = { success: true; id: string } | { success: false; error: string };

/**
 * 「+職種を追加」(SCREEN_SPEC.md 4章「職種枠セクション」)。
 * 実際にDBで採番されたidを返す(呼び出し元がcrypto.randomUUID()等のダミーIDで
 * ローカル状態を作ると、リロード前に続けてフリーランスをアサインした際、
 * 存在しないIDでproject_role_assignmentsへ書き込もうとして外部キー制約違反になるため)。
 */
export async function addProjectRole(
  projectId: string,
  jobCategory: JobCategory,
  headcount: number
): Promise<AddProjectRoleResult> {
  const authCheck = await requireEditAccess("projects");
  if (!authCheck.ok) return { success: false, error: authCheck.error };

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("project_roles")
    .insert({ project_id: projectId, job_category: jobCategory, headcount })
    .select("id")
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath(`/projects/${projectId}`);
  return { success: true, id: data.id };
}

/** 職種枠を削除する(紐づくフリーランスアサインもDBのON DELETE CASCADEで一緒に削除される) */
export async function removeProjectRole(
  projectId: string,
  roleId: string
): Promise<MutationResult> {
  const authCheck = await requireEditAccess("projects");
  if (!authCheck.ok) return { success: false, error: authCheck.error };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("project_roles").delete().eq("id", roleId);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath(`/projects/${projectId}`);
  return { success: true };
}

/**
 * 職種枠へフリーランスを一括アサインする(SCREEN_SPEC.md 4章「フリーランスアサインモーダル」)。
 * DB_SCHEMA.md: 重複アサイン(同一フリーランスが複数枠/複数案件)は許容するため
 * ユニーク制約はなく、ここでは素直にinsertするのみ(同一枠内の重複除外はUI側で行う)。
 */
export type AssignFreelancersResult =
  | { success: true; assignments: { id: string; freelancerId: string }[] }
  | { success: false; error: string };

/**
 * 実際にDBで採番されたidを(freelancer_idと対にして)返す。addProjectRoleと同じ理由で、
 * 呼び出し元がダミーIDでローカル状態を作ると、リロード前に続けてアサイン解除しようとした際
 * 外部キー制約違反になるため。
 */
export async function assignFreelancersToRole(
  projectId: string,
  roleId: string,
  freelancerIds: string[]
): Promise<AssignFreelancersResult> {
  const authCheck = await requireEditAccess("projects");
  if (!authCheck.ok) return { success: false, error: authCheck.error };

  const supabase = await createSupabaseServerClient();
  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from("project_role_assignments")
    .insert(
      freelancerIds.map((freelancerId) => ({
        project_role_id: roleId,
        freelancer_id: freelancerId,
        assigned_at: today,
      }))
    )
    .select("id, freelancer_id");

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath(`/projects/${projectId}`);
  return {
    success: true,
    assignments: (data ?? []).map((row) => ({ id: row.id, freelancerId: row.freelancer_id })),
  };
}

/** フリーランスアサインを解除する */
export async function removeFreelancerAssignment(
  projectId: string,
  assignmentId: string
): Promise<MutationResult> {
  const authCheck = await requireEditAccess("projects");
  if (!authCheck.ok) return { success: false, error: authCheck.error };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("project_role_assignments")
    .delete()
    .eq("id", assignmentId);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath(`/projects/${projectId}`);
  return { success: true };
}
