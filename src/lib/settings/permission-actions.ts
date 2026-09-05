"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import type { PagePermission } from "@/lib/supabase/database.types";
import { buildBulkPermissionUpserts, type PermissionTemplateRow } from "./permissions";

export type MutationResult = { success: true } | { success: false; error: string };

/**
 * 個人別のページ権限を保存する(SCREEN_SPEC.md 10章 9-2)。
 * 権限設定画面はadmin限定のため、サーバー側でも必ず確認する。
 */
export async function saveUserPermissions(
  userId: string,
  rows: PermissionTemplateRow[]
): Promise<MutationResult> {
  const authCheck = await requireAdmin();
  if (!authCheck.ok) return { success: false, error: authCheck.error };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("user_page_permissions").upsert(
    rows.map((row) => ({ user_id: userId, page_key: row.pageKey, permission: row.permission })),
    { onConflict: "user_id,page_key" }
  );

  if (error) return { success: false, error: error.message };

  revalidatePath("/settings");
  return { success: true };
}

/**
 * 部署一括適用(SCREEN_SPEC.md 10章 9-2)。
 * department_page_permissionsをテンプレートとして保存し、
 * 「◯◯部の全メンバーに適用」ボタンで該当部署の全ユーザーの
 * user_page_permissionsへ一括upsertする。
 */
export async function saveDepartmentTemplate(
  departmentId: string,
  rows: PermissionTemplateRow[]
): Promise<MutationResult> {
  const authCheck = await requireAdmin();
  if (!authCheck.ok) return { success: false, error: authCheck.error };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("department_page_permissions").upsert(
    rows.map((row) => ({ department_id: departmentId, page_key: row.pageKey, permission: row.permission })),
    { onConflict: "department_id,page_key" }
  );

  if (error) return { success: false, error: error.message };

  revalidatePath("/settings");
  return { success: true };
}

export async function applyDepartmentTemplateToMembers(
  departmentId: string,
  rows: PermissionTemplateRow[]
): Promise<MutationResult> {
  const authCheck = await requireAdmin();
  if (!authCheck.ok) return { success: false, error: authCheck.error };

  const supabase = await createSupabaseServerClient();

  const { data: members, error: membersError } = await supabase
    .from("users")
    .select("id")
    .eq("department_id", departmentId);

  if (membersError) return { success: false, error: membersError.message };
  if (!members || members.length === 0) {
    return { success: false, error: "この部署にはメンバーがいません。" };
  }

  const upserts = buildBulkPermissionUpserts(
    members.map((m) => m.id),
    rows
  );

  const { error } = await supabase
    .from("user_page_permissions")
    .upsert(upserts, { onConflict: "user_id,page_key" });

  if (error) return { success: false, error: error.message };

  revalidatePath("/settings");
  return { success: true };
}

export async function createDepartment(name: string): Promise<MutationResult> {
  const authCheck = await requireAdmin();
  if (!authCheck.ok) return { success: false, error: authCheck.error };

  if (!name.trim()) {
    return { success: false, error: "部署名を入力してください。" };
  }
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("departments").insert({ name: name.trim() });
  if (error) return { success: false, error: error.message };

  revalidatePath("/settings");
  return { success: true };
}

// PagePermission は saveUserPermissions 等の呼び出し元で型注釈に使う
export type { PagePermission };
