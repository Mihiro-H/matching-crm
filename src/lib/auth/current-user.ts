import { cache } from "react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";

export type CurrentUser = Database["public"]["Tables"]["users"]["Row"] & {
  departmentName: string | null;
};

/**
 * ログイン中のユーザーを取得する。
 * auth.usersにセッションはあるがpublic.usersに対応行がない場合(未プロビジョニング)は
 * nullを返す(SCREEN_SPEC.md ログイン画面: 本来はauth/callbackの時点で弾かれるはずだが、
 * 念のためここでも同じ判定をする)。
 * React cache()でリクエスト単位にメモ化する(layout/pageから重複して呼ばれるため)。
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) return null;

  const { data, error } = await supabase
    .from("users")
    .select("*, department:departments(name)")
    .eq("id", authUser.id)
    .maybeSingle();
  if (error || !data) return null;

  const { department, ...user } = data;
  return { ...user, departmentName: department?.name ?? null };
});

export async function getCurrentUserId(): Promise<string | null> {
  const user = await getCurrentUser();
  return user?.id ?? null;
}
