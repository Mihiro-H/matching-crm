import type { EstimateDocumentType } from "@/lib/supabase/database.types";
import type { CloudSignEnv } from "./client";

export type CloudSignConfig = { clientId: string; env: CloudSignEnv; templateId: string };

const TEMPLATE_ENV_KEY: Record<EstimateDocumentType, string> = {
  estimate: "CLOUDSIGN_TEMPLATE_ID_ESTIMATE",
  order: "CLOUDSIGN_TEMPLATE_ID_ORDER",
};

/**
 * クラウドサイン連携に必要な環境変数を読み、書類種別ごとの設定を返す。
 * 未設定の場合はnull(呼び出し側で「連携未設定」として案内する)。
 */
export function getCloudSignConfig(documentType: EstimateDocumentType): CloudSignConfig | null {
  const clientId = process.env.CLOUDSIGN_CLIENT_ID;
  const templateId = process.env[TEMPLATE_ENV_KEY[documentType]];
  const env: CloudSignEnv = process.env.CLOUDSIGN_ENV === "production" ? "production" : "sandbox";

  if (!clientId || !templateId) return null;
  return { clientId, env, templateId };
}
