/**
 * TODO(auth): Supabase Auth実装後、実際のセッションユーザーのidを返すようにする。
 * 現時点では認証が未実装のため、常にnullを返す
 * (imported_by/created_by等、実ユーザーIDが必須の操作はこの関数がnullを返す間は行えない)。
 */
export async function getCurrentUserId(): Promise<string | null> {
  return null;
}
