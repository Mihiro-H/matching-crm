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
 * 引数には、クライアントが偽装できないことが保証された値を渡すこと
 * (例: Vercelの`x-vercel-forwarded-for`。標準の`x-forwarded-for`はクライアントが
 * 自由な値を書き込め、プラットフォームが必ず上書き/除去するとは限らないため不可)。
 * 先頭要素のみを実クライアントIPとして扱う。2つ目以降は中継プロキシのIPが並びうるため使わない。
 */
export function isFromCloudSignIpRange(
  trustedClientIpHeader: string | null,
  env: CloudSignEnv
): boolean {
  if (!trustedClientIpHeader) return false;
  const clientIp = trustedClientIpHeader.split(",")[0]?.trim();
  if (!clientIp) return false;
  return CLOUDSIGN_WEBHOOK_IPS[env].includes(clientIp);
}
