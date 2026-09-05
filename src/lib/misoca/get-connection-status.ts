import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type MisocaConnectionStatus = {
  connected: boolean;
  connectedByName: string | null;
  updatedAt: string | null;
};

/**
 * 設定画面「外部連携」用の接続状況(SCREEN_SPEC.md「外部連携」)。
 * misoca_oauth_tokensはauthenticatedロールへのポリシーを一切与えていないため
 * (トークン漏洩防止)、この読み取りも必ずservice role権限のadminクライアントで行う。
 * access_token/refresh_tokenそのものは絶対にここで選択しない。
 */
export async function getMisocaConnectionStatus(): Promise<MisocaConnectionStatus> {
  const admin = createSupabaseAdminClient();
  const { data } = await admin
    .from("misoca_oauth_tokens")
    .select("updated_at, connected_user:users(name)")
    .eq("id", true)
    .maybeSingle();

  if (!data) {
    return { connected: false, connectedByName: null, updatedAt: null };
  }

  return { connected: true, connectedByName: data.connected_user?.name ?? null, updatedAt: data.updated_at };
}
