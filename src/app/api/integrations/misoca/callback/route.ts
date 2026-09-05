import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getCurrentUserId } from "@/lib/auth/current-user";
import { exchangeMisocaCodeForTokens, getMisocaRedirectUri } from "@/lib/misoca/oauth";
import { MISOCA_OAUTH_STATE_COOKIE } from "../authorize/route";

/** Misoca側で認可した後にリダイレクトされてくるコールバック。トークンを保存する。 */
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");

  const cookieStore = await cookies();
  const expectedState = cookieStore.get(MISOCA_OAUTH_STATE_COOKIE)?.value;
  cookieStore.delete(MISOCA_OAUTH_STATE_COOKIE);

  if (!code || !state || !expectedState || state !== expectedState) {
    return NextResponse.redirect(new URL("/settings/integrations?misocaError=認可の検証に失敗しました", request.url));
  }

  const clientId = process.env.MISOCA_CLIENT_ID;
  const clientSecret = process.env.MISOCA_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return NextResponse.redirect(
      new URL("/settings/integrations?misocaError=MISOCA_CLIENT_ID/MISOCA_CLIENT_SECRETが未設定です", request.url)
    );
  }

  const tokenResult = await exchangeMisocaCodeForTokens({
    clientId,
    clientSecret,
    code,
    redirectUri: getMisocaRedirectUri(),
  });

  if (!tokenResult.ok) {
    return NextResponse.redirect(
      new URL(`/settings/integrations?misocaError=${encodeURIComponent(tokenResult.error)}`, request.url)
    );
  }

  const currentUserId = await getCurrentUserId();
  const admin = createSupabaseAdminClient();
  const { error } = await admin.from("misoca_oauth_tokens").upsert({
    id: true,
    access_token: tokenResult.accessToken,
    refresh_token: tokenResult.refreshToken,
    expires_at: new Date(Date.now() + tokenResult.expiresInSeconds * 1000).toISOString(),
    connected_by: currentUserId,
  });

  if (error) {
    return NextResponse.redirect(
      new URL(`/settings/integrations?misocaError=${encodeURIComponent(error.message)}`, request.url)
    );
  }

  return NextResponse.redirect(new URL("/settings/integrations?misocaConnected=1", request.url));
}
