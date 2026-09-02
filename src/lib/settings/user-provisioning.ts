"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth/require-admin";
import type { UserRole } from "@/lib/supabase/database.types";

export type CreateUserResult = { success: true } | { success: false; error: string };

/**
 * 「ユーザー管理」での新規ユーザー登録(SCREEN_SPEC.md 10章 9-2)。
 *
 * public.users.id は auth.users.id への外部キーのため、本人が一度も
 * Googleログインを試みていない間は行を作成できない。そのため、まず
 * service role権限でauth.usersをメールアドレス検索し、見つかった場合のみ
 * その auth.users.id で public.users を作成する。
 *
 * (Admin APIにメール完全一致検索のメソッドがないため、一覧を取得してJS側で
 * フィルタする。社内ツール規模のユーザー数を前提とした実装)
 */
export async function createUserFromExistingAuthAccount(input: {
  email: string;
  name: string;
  role: UserRole;
  departmentId: string | null;
}): Promise<CreateUserResult> {
  // 権限設定画面はadmin限定(SCREEN_SPEC.md 10章 9-2)。このServer Actionは
  // service role権限でauth.usersを検索しpublic.usersへ書き込む強い操作のため、
  // サーバー側でも呼び出し元がadminであることを必ず確認する
  // (フォームやナビゲーションの非表示だけに頼らない)。
  const authCheck = await requireAdmin();
  if (!authCheck.ok) {
    return { success: false, error: authCheck.error };
  }

  const email = input.email.trim().toLowerCase();
  if (!email) {
    return { success: false, error: "メールアドレスを入力してください。" };
  }
  if (!input.name.trim()) {
    return { success: false, error: "氏名を入力してください。" };
  }

  const admin = createSupabaseAdminClient();

  let authUserId: string | null = null;
  let page = 1;
  const perPage = 200;
  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) {
      return { success: false, error: `auth.usersの検索に失敗しました: ${error.message}` };
    }
    const match = data.users.find((u) => u.email?.toLowerCase() === email);
    if (match) {
      authUserId = match.id;
      break;
    }
    if (data.users.length < perPage) break;
    page++;
  }

  if (!authUserId) {
    return {
      success: false,
      error:
        "このメールアドレスでのログイン試行がまだありません。本人に一度「Googleでログイン」を試してもらってから登録してください。",
    };
  }

  const supabase = await createSupabaseServerClient();
  const { error: insertError } = await supabase.from("users").insert({
    id: authUserId,
    name: input.name.trim(),
    email,
    role: input.role,
    department_id: input.departmentId,
  });

  if (insertError) {
    return { success: false, error: insertError.message };
  }

  revalidatePath("/settings/permissions");
  return { success: true };
}
