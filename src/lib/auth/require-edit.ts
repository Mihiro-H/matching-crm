import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUser } from "./current-user";
import type { PageKey } from "@/lib/navigation";

export type RequireEditResult = { ok: true } | { ok: false; error: string };

/**
 * Server Actionの先頭で呼び、そのページのedit権限を持つユーザーのみ操作を許可する
 * (SCREEN_SPEC.md各章「権限: viewは...を不可」)。
 * ナビゲーション/ボタンの非表示だけに頼らず、書き込み系の全Server Actionで必ず呼ぶ。
 */
export async function requireEditAccess(pageKey: PageKey): Promise<RequireEditResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { ok: false, error: "ログインが必要です。" };
  }

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("user_page_permissions")
    .select("permission")
    .eq("user_id", user.id)
    .eq("page_key", pageKey)
    .maybeSingle();

  const permission = data?.permission ?? "view";
  if (permission !== "edit") {
    return { ok: false, error: "この操作を行う権限がありません。" };
  }
  return { ok: true };
}
