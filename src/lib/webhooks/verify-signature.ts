import { createHmac, timingSafeEqual } from "node:crypto";

const FIVE_MINUTES_SECONDS = 5 * 60;

function timingSafeStringEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

/**
 * Slack Events API の署名検証(公式ドキュメントの標準手順)。
 * v0:{timestamp}:{rawBody} をHMAC-SHA256し、"v0="付きhexを比較する。
 * リプレイ攻撃対策として、timestampが5分以上前のリクエストは拒否する。
 */
export function verifySlackSignature(
  signingSecret: string,
  timestamp: string,
  rawBody: string,
  signatureHeader: string
): boolean {
  const nowSeconds = Math.floor(Date.now() / 1000);
  const tsNumber = Number(timestamp);
  if (!Number.isFinite(tsNumber) || Math.abs(nowSeconds - tsNumber) > FIVE_MINUTES_SECONDS) {
    return false;
  }

  const base = `v0:${timestamp}:${rawBody}`;
  const expected = `v0=${createHmac("sha256", signingSecret).update(base).digest("hex")}`;

  return timingSafeStringEqual(expected, signatureHeader);
}

/**
 * Zoom Webhookの「URL Validation」チャレンジ応答(公式ドキュメントの標準手順)。
 * secretTokenでplainTokenをHMAC-SHA256したhexを encryptedToken として返す。
 */
export function computeZoomChallengeResponse(secretToken: string, plainToken: string): string {
  return createHmac("sha256", secretToken).update(plainToken).digest("hex");
}

/**
 * 単純な共有シークレット方式のWebhook認証(freee/クラウドサイン/フォーム等、
 * サービスごとの正確な署名方式が未確定なもの向けの暫定実装)。
 * ヘッダーやクエリパラメータで渡された値を、環境変数の値とtiming-safeに比較する。
 */
export function verifySharedSecret(expected: string, provided: string | null): boolean {
  if (!provided) return false;
  return timingSafeStringEqual(expected, provided);
}
