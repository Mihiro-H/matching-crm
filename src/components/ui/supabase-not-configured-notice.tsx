/**
 * Supabase未接続時の共通の案内表示。
 * createSupabaseServerClient()はisSupabaseConfigured()===falseのとき例外を投げるため、
 * データ取得や権限チェック(getCurrentUser等)を呼ぶページは必ず事前にガードすること。
 */
export function SupabaseNotConfiguredNotice() {
  return (
    <div className="rounded-lg border border-neutral-200 bg-neutral-0 p-8">
      <h2 className="text-lg text-neutral-900">Supabase未接続です</h2>
      <p className="mt-2 text-sm text-neutral-600">
        Supabaseの接続情報を .env に設定すると、この画面が表示されます。
      </p>
    </div>
  );
}
