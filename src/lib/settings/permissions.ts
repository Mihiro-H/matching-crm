import type { PagePermission } from "@/lib/supabase/database.types";

export type PermissionTemplateRow = { pageKey: string; permission: PagePermission };
export type UserPagePermissionUpsert = { user_id: string; page_key: string; permission: PagePermission };

/**
 * 「部署一括」適用(SCREEN_SPEC.md 10章 9-2)。
 * department_page_permissionsのテンプレート行を、部署の全メンバーの
 * user_page_permissionsへ一括upsertするためのペイロードを組み立てる。
 */
export function buildBulkPermissionUpserts(
  memberUserIds: string[],
  templateRows: PermissionTemplateRow[]
): UserPagePermissionUpsert[] {
  return memberUserIds.flatMap((userId) =>
    templateRows.map((row) => ({ user_id: userId, page_key: row.pageKey, permission: row.permission }))
  );
}
