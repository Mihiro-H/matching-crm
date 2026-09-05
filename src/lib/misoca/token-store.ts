import "server-only";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { refreshMisocaAccessToken } from "./oauth";

// トークンの有効期限ちょうどまで使い切ろうとすると、リクエスト実行中に切れる恐れが
// あるため、期限の5分前になったら早めに更新する。
const EXPIRY_BUFFER_MS = 5 * 60 * 1000;

export type GetAccessTokenResult = { ok: true; accessToken: string } | { ok: false; error: string };

/**
 * 保存済みのMisocaアクセストークンを返す。期限が近い/切れている場合は
 * リフレッシュトークンで自動更新し、DBの保存内容も更新する。
 */
export async function getValidMisocaAccessToken(): Promise<GetAccessTokenResult> {
  const clientId = process.env.MISOCA_CLIENT_ID;
  const clientSecret = process.env.MISOCA_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return { ok: false, error: "Misoca連携が未設定です(MISOCA_CLIENT_ID/MISOCA_CLIENT_SECRETを.envに設定してください)。" };
  }

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("misoca_oauth_tokens")
    .select("access_token, refresh_token, expires_at")
    .eq("id", true)
    .maybeSingle();

  if (error) return { ok: false, error: error.message };
  if (!data) {
    return { ok: false, error: "Misocaと連携されていません。設定 > 外部連携 から連携してください。" };
  }

  const expiresAtMs = new Date(data.expires_at).getTime();
  if (expiresAtMs - EXPIRY_BUFFER_MS > Date.now()) {
    return { ok: true, accessToken: data.access_token };
  }

  const refreshed = await refreshMisocaAccessToken({
    clientId,
    clientSecret,
    refreshToken: data.refresh_token,
  });
  if (!refreshed.ok) return refreshed;

  const { error: updateError } = await admin
    .from("misoca_oauth_tokens")
    .update({
      access_token: refreshed.accessToken,
      refresh_token: refreshed.refreshToken,
      expires_at: new Date(Date.now() + refreshed.expiresInSeconds * 1000).toISOString(),
    })
    .eq("id", true);

  if (updateError) return { ok: false, error: updateError.message };

  return { ok: true, accessToken: refreshed.accessToken };
}
