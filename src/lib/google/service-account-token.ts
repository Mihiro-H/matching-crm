import { createSignedJwt, normalizePrivateKey } from "./jwt";

const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const DRIVE_READONLY_SCOPE = "https://www.googleapis.com/auth/drive.readonly";
const JWT_BEARER_GRANT_TYPE = "urn:ietf:params:oauth:grant-type:jwt-bearer";

export type ServiceAccountCredentials = { clientEmail: string; privateKey: string };
export type GetAccessTokenResult = { ok: true; accessToken: string } | { ok: false; error: string };

/**
 * サービスアカウントのJWT Bearer Token FlowでGoogle Drive read-onlyのアクセストークンを取る。
 * https://developers.google.com/identity/protocols/oauth2/service-account
 */
export async function getGoogleDriveAccessToken(
  credentials: ServiceAccountCredentials,
  deps: {
    fetchImpl?: typeof fetch;
    nowSeconds?: number;
    /** テスト用の差し替え口。本番は省略してcreateSignedJwtをそのまま使う。 */
    signJwt?: typeof createSignedJwt;
  } = {}
): Promise<GetAccessTokenResult> {
  const fetchImpl = deps.fetchImpl ?? fetch;
  const nowSeconds = deps.nowSeconds ?? Math.floor(Date.now() / 1000);
  const signJwt = deps.signJwt ?? createSignedJwt;

  const jwt = signJwt({
    clientEmail: credentials.clientEmail,
    privateKeyPem: normalizePrivateKey(credentials.privateKey),
    scope: DRIVE_READONLY_SCOPE,
    audience: TOKEN_ENDPOINT,
    issuedAtSeconds: nowSeconds,
  });

  const body = `grant_type=${encodeURIComponent(JWT_BEARER_GRANT_TYPE)}&assertion=${encodeURIComponent(jwt)}`;
  const response = await fetchImpl(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!response.ok) {
    return { ok: false, error: `Googleアクセストークン取得に失敗しました(${response.status})` };
  }

  const json = (await response.json()) as { access_token?: string };
  if (!json.access_token) {
    return { ok: false, error: "Googleアクセストークン取得に失敗しました(access_tokenが空です)" };
  }
  return { ok: true, accessToken: json.access_token };
}
