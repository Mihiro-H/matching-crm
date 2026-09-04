import { createSign } from "node:crypto";

const JWT_EXPIRY_SECONDS = 3600;

function base64url(input: string | Buffer): string {
  const buf = typeof input === "string" ? Buffer.from(input, "utf8") : input;
  return buf.toString("base64url");
}

/**
 * .envに1行で貼り付けた秘密鍵(改行が"\n"という2文字にエスケープされている)を
 * 実際の改行に戻す。既に実改行のPEMならそのまま返す。
 */
export function normalizePrivateKey(raw: string): string {
  return raw.includes("\\n") ? raw.replace(/\\n/g, "\n") : raw;
}

/**
 * Googleサービスアカウント(JWT Bearer Token Flow)用の署名済みJWTを作る。
 * https://developers.google.com/identity/protocols/oauth2/service-account#authorizingrequests
 */
export function createSignedJwt(params: {
  clientEmail: string;
  privateKeyPem: string;
  scope: string;
  audience: string;
  issuedAtSeconds: number;
}): string {
  const header = { alg: "RS256", typ: "JWT" };
  const claims = {
    iss: params.clientEmail,
    scope: params.scope,
    aud: params.audience,
    iat: params.issuedAtSeconds,
    exp: params.issuedAtSeconds + JWT_EXPIRY_SECONDS,
  };

  const headerB64 = base64url(JSON.stringify(header));
  const claimsB64 = base64url(JSON.stringify(claims));
  const signingInput = `${headerB64}.${claimsB64}`;

  const signer = createSign("RSA-SHA256");
  signer.update(signingInput);
  signer.end();
  const signature = signer.sign(params.privateKeyPem);

  return `${signingInput}.${base64url(signature)}`;
}
