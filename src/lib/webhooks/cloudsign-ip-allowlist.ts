import type { CloudSignEnv } from "@/lib/cloudsign/client";

/**
 * クラウドサインWebhookの送信元固定IPアドレス(公式ヘルプ「Webhook実行時の挙動」で確認済み)。
 * クラウドサインはWebhookリクエストにカスタムヘッダーを付与できないため、URLに埋め込んだ
 * 共有シークレット(verifySharedSecret)だけでは、そのURLが漏洩した場合に突破されうる。
 * このIPアローリストを追加の防御層として組み合わせることで、URL漏洩だけでは突破できなくする。
 */
const CLOUDSIGN_WEBHOOK_IPS: Record<CloudSignEnv, readonly string[]> = {
  production: ["52.68.17.229", "52.198.144.82", "3.112.114.42"],
  sandbox: ["52.197.119.179"],
};

/**
 * Vercelのようなエッジプロキシ配下では、`x-forwarded-for` の先頭が実クライアントIP
 * (プロキシが自ら付与する値で、クライアントからの偽装分は上書きされる)。
 * 2つ目以降は中継プロキシのIPが並ぶため使わない。
 */
export function isFromCloudSignIpRange(
  xForwardedFor: string | null,
  env: CloudSignEnv
): boolean {
  if (!xForwardedFor) return false;
  const clientIp = xForwardedFor.split(",")[0]?.trim();
  if (!clientIp) return false;
  return CLOUDSIGN_WEBHOOK_IPS[env].includes(clientIp);
}
