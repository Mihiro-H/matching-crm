import { getCurrentUser, type CurrentUser } from "./current-user";

/**
 * admin限定の操作(SCREEN_SPEC.md 10章「権限設定」等)を行うServer Actionの先頭で呼ぶ。
 * ナビゲーション上の非表示だけに頼らず、サーバー側でも必ず権限を確認する。
 */
export async function requireAdmin(): Promise<
  { ok: true; user: CurrentUser } | { ok: false; error: string }
> {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    return { ok: false, error: "この操作には管理者権限が必要です。" };
  }
  return { ok: true, user };
}
