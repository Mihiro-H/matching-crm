import { Logo } from "@/components/layout/logo";
import { signInWithGoogle } from "@/lib/auth/actions";
import { isSupabaseConfigured } from "@/lib/supabase/server";

const ERROR_MESSAGES: Record<string, string> = {
  oauth_start_failed: "ログイン処理の開始に失敗しました。時間をおいて再度お試しください。",
  no_account: "アカウントが登録されていません。管理者にアカウント作成を依頼してください。",
};

// SCREEN_SPEC.md 0章: ログイン画面
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const { error, next } = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center bg-page-bg">
      <div className="flex w-full max-w-sm flex-col items-center gap-6 rounded-lg border border-neutral-200 bg-neutral-0 p-8">
        <Logo />

        {error && ERROR_MESSAGES[error] && (
          <p className="text-center text-sm text-danger-text">{ERROR_MESSAGES[error]}</p>
        )}

        {isSupabaseConfigured() ? (
          <form action={signInWithGoogle} className="w-full">
            <input type="hidden" name="next" value={next ?? ""} />
            <button
              type="submit"
              className="w-full rounded-md border border-neutral-200 px-4 py-2 text-sm text-neutral-900 hover:bg-page-bg"
            >
              Googleでログイン
            </button>
          </form>
        ) : (
          <p className="text-center text-sm text-neutral-600">
            Supabaseが未接続のため、ログインはまだ利用できません。
          </p>
        )}
      </div>
    </div>
  );
}
