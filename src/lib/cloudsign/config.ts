import type { CloudSignEnv } from "./client";

export type CloudSignConfig = { clientId: string; env: CloudSignEnv; templateId: string };

/**
 * クラウドサイン連携に必要な環境変数を読み、見積書用の設定を返す。
 * 未設定の場合はnull(呼び出し側で「連携未設定」として案内する)。
 *
 * 納品書はMisoca上も別書類種別で押印・署名を要する運用ではないため、
 * クラウドサイン送付の対象は見積書のみとする(PDFダウンロードのみ提供)。
 */
export function getCloudSignConfig(): CloudSignConfig | null {
  const clientId = process.env.CLOUDSIGN_CLIENT_ID;
  const templateId = process.env.CLOUDSIGN_TEMPLATE_ID_ESTIMATE;
  const env: CloudSignEnv = process.env.CLOUDSIGN_ENV === "production" ? "production" : "sandbox";

  if (!clientId || !templateId) return null;
  return { clientId, env, templateId };
}
