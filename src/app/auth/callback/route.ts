import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSafeRedirectPath } from "@/lib/auth/safe-redirect";

/**
 * Google OAuthコールバック(SCREEN_SPEC.md 0章)。
 * セッション確立後、public.usersに対応行があるかを確認し、
 * なければその場でサインアウトして「管理者にアカウント作成を依頼」に誘導する。
 * (public.users.idはauth.users.idへの外部キーのため、行の有無で
 * プロビジョニング済みかどうかを判定できる。トリガーによる自動作成は行わない
 * — supabase/migrations/20260902024752_initial_schema.sqlのコメント参照)
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=oauth_start_failed`);
  }

  const supabase = await createSupabaseServerClient();
  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
  if (exchangeError) {
    return NextResponse.redirect(`${origin}/login?error=oauth_start_failed`);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(`${origin}/login?error=oauth_start_failed`);
  }

  const { data: profile } = await supabase.from("users").select("id").eq("id", user.id).maybeSingle();

  if (!profile) {
    await supabase.auth.signOut();
    return NextResponse.redirect(`${origin}/login?error=no_account`);
  }

  const next = getSafeRedirectPath(searchParams.get("next"));
  return NextResponse.redirect(`${origin}${next}`);
}
