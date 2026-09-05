import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUser, type CurrentUser } from "./current-user";
import type { PagePermission } from "@/lib/supabase/database.types";
import { DEFAULT_HIDDEN_PAGE_KEYS, NAV_ITEMS, type PageKey } from "@/lib/navigation";

/**
 * 未設定のページ・ユーザーのデフォルト権限はview(DB_SCHEMA.md確定事項)。
 * ただしcompanies/peopleは既定でhidden(navigation.ts DEFAULT_HIDDEN_PAGE_KEYS参照、
 * サイドバーには項目として出すが明示的に権限を付与されるまでは表示しない)。
 * この非表示既定は一般ユーザー向けの制御のため、管理者(admin)は明示的な権限行が
 * 無くてもview扱いにしてバイパスする(実際に管理者アカウントで/peopleが404になる
 * 不具合として報告されたための対応)。他ページのadmin既定(view)には影響しない。
 */
function getDefaultPagePermission(pageKey: PageKey, isAdmin: boolean): PagePermission {
  if (DEFAULT_HIDDEN_PAGE_KEYS.includes(pageKey)) {
    return isAdmin ? "view" : "hidden";
  }
  return "view";
}

export async function getPagePermission(pageKey: PageKey): Promise<PagePermission> {
  const user = await getCurrentUser();
  if (!user) return "hidden";

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("user_page_permissions")
    .select("permission")
    .eq("user_id", user.id)
    .eq("page_key", pageKey)
    .maybeSingle();

  return data?.permission ?? getDefaultPagePermission(pageKey, user.role === "admin");
}

/**
 * 一般ページの先頭で呼ぶ。hidden権限(または未ログイン)ならnotFound()にする
 * (URLを直接叩いてもアクセスできないようにする、SCREEN_SPEC.md共通の要件)。
 * canEditは画面内の編集系操作(ボタン等)の表示/活性化に使う。
 */
export async function requirePageAccess(
  pageKey: PageKey
): Promise<{ user: CurrentUser; canEdit: boolean }> {
  const user = await getCurrentUser();
  if (!user) notFound();

  const permission = await getPagePermission(pageKey);
  if (permission === "hidden") notFound();

  return { user, canEdit: permission === "edit" };
}

/**
 * サイドナビ表示用に、現在ユーザーの全ページ権限を一括取得する(N回クエリを避ける)。
 * 明示的な行が無いページもNAV_ITEMSの全pageKey分デフォルト値で埋めて返す
 * (companies/peopleのデフォルトhiddenがSideNavの「hidden以外は表示」判定に
 * 正しく反映されるようにするため)。
 */
export async function getAllPagePermissionsForCurrentUser(): Promise<Record<string, PagePermission>> {
  const user = await getCurrentUser();
  if (!user) return {};

  const isAdmin = user.role === "admin";
  const result: Record<string, PagePermission> = {};
  for (const item of NAV_ITEMS) {
    result[item.pageKey] = getDefaultPagePermission(item.pageKey, isAdmin);
  }

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("user_page_permissions")
    .select("page_key, permission")
    .eq("user_id", user.id);

  for (const row of data ?? []) {
    result[row.page_key] = row.permission;
  }
  return result;
}

/**
 * admin限定ページ(freelancers/settings)の先頭で呼ぶ。
 * SCREEN_SPEC.md:「hidden権限に関わらず、adminロール限定」。
 */
export async function requireAdminPageAccess(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") notFound();
  return user;
}
