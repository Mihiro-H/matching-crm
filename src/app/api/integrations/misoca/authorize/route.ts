import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { randomBytes } from "node:crypto";
import { requireAdmin } from "@/lib/auth/require-admin";
import { buildMisocaAuthorizeUrl, getMisocaRedirectUri } from "@/lib/misoca/oauth";

export const MISOCA_OAUTH_STATE_COOKIE = "misoca_oauth_state";

/**
 * 設定画面の「Misocaと連携する」リンク先(SCREEN_SPEC.md「外部連携」)。
 * OAuth2の認可コードフローを開始する。管理者限定(admin以外は連携操作不可)。
 */
export async function GET(request: NextRequest) {
  const authCheck = await requireAdmin();
  if (!authCheck.ok) {
    return NextResponse.redirect(
      new URL(`/settings/integrations?misocaError=${encodeURIComponent(authCheck.error)}`, request.url)
    );
  }

  const clientId = process.env.MISOCA_CLIENT_ID;
  if (!clientId) {
    return NextResponse.redirect(
      new URL("/settings/integrations?misocaError=MISOCA_CLIENT_IDが未設定です", request.url)
    );
  }

  // CSRF対策: 認可コードフローの往復で照合するランダム値をhttpOnly cookieに積んでおく。
  const state = randomBytes(16).toString("hex");
  const cookieStore = await cookies();
  cookieStore.set(MISOCA_OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    // ローカル開発はhttp://localhostのため、secure:trueだと環境によってはcookieが
    // 設定されず認可が常に失敗しうる。本番相当(NEXT_PUBLIC_SITE_URLがhttps)でのみ要求する。
    secure: getMisocaRedirectUri().startsWith("https://"),
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });

  const authorizeUrl = buildMisocaAuthorizeUrl({
    clientId,
    redirectUri: getMisocaRedirectUri(),
    state,
  });

  return NextResponse.redirect(authorizeUrl);
}
