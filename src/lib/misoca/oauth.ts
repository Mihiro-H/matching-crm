const MISOCA_AUTHORIZE_URL = "https://app.misoca.jp/oauth2/authorize";
const MISOCA_TOKEN_URL = "https://app.misoca.jp/oauth2/token";

/**
 * 認可開始(/api/integrations/misoca/authorize)とコールバック(.../callback)の両方で
 * 必ず同じ値を使う必要がある(OAuth2は redirect_uri の完全一致を要求するため)。
 * リクエストの Origin ヘッダーは通常のブラウザ遷移(fetchでない画面遷移)では
 * 送られないことがあり不安定なため、環境変数から決め打ちで組み立てる。
 */
export function getMisocaRedirectUri(): string {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  return `${base}/api/integrations/misoca/callback`;
}

export type TokenResult =
  | { ok: true; accessToken: string; refreshToken: string; expiresInSeconds: number }
  | { ok: false; error: string };

/**
 * Misoca連携の認可開始URL(公式ドキュメント: OAuth2.0、scopeはread/write)。
 * stateはCSRF対策用に呼び出し側で発行し、コールバック側で照合すること。
 */
export function buildMisocaAuthorizeUrl(params: {
  clientId: string;
  redirectUri: string;
  state: string;
}): string {
  const query = new URLSearchParams({
    client_id: params.clientId,
    redirect_uri: params.redirectUri,
    response_type: "code",
    scope: "read write",
    state: params.state,
  });
  return `${MISOCA_AUTHORIZE_URL}?${query.toString()}`;
}

async function requestToken(
  body: Record<string, string>,
  fetchImpl: typeof fetch,
  errorPrefix: string
): Promise<TokenResult> {
  const response = await fetchImpl(MISOCA_TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(body).toString(),
  });

  if (!response.ok) {
    return { ok: false, error: `${errorPrefix}(${response.status})` };
  }

  const json = (await response.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
  };
  if (!json.access_token || !json.refresh_token) {
    return { ok: false, error: `${errorPrefix}(トークンが空です)` };
  }

  return {
    ok: true,
    accessToken: json.access_token,
    refreshToken: json.refresh_token,
    expiresInSeconds: json.expires_in ?? 86400,
  };
}

/**
 * 認可コードをアクセストークン/リフレッシュトークンに交換する
 * (Misoca公式ヘルプ「トークンの有効期間は1日」との記載に基づきexpires_inのデフォルトを設定)。
 * リクエストボディの正確なフィールド名は、公開ドキュメントに詳細が無いため標準的な
 * OAuth2 Authorization Code Grantの形式を仮定している。実アカウントでの検証が必要。
 */
export async function exchangeMisocaCodeForTokens(
  params: { clientId: string; clientSecret: string; code: string; redirectUri: string },
  fetchImpl: typeof fetch = fetch
): Promise<TokenResult> {
  return requestToken(
    {
      grant_type: "authorization_code",
      client_id: params.clientId,
      client_secret: params.clientSecret,
      code: params.code,
      redirect_uri: params.redirectUri,
    },
    fetchImpl,
    "Misocaのトークン取得に失敗しました"
  );
}

/** リフレッシュトークンでアクセストークンを更新する(標準的なOAuth2 Refresh Token Grant)。 */
export async function refreshMisocaAccessToken(
  params: { clientId: string; clientSecret: string; refreshToken: string },
  fetchImpl: typeof fetch = fetch
): Promise<TokenResult> {
  return requestToken(
    {
      grant_type: "refresh_token",
      client_id: params.clientId,
      client_secret: params.clientSecret,
      refresh_token: params.refreshToken,
    },
    fetchImpl,
    "Misocaのトークン更新に失敗しました"
  );
}
