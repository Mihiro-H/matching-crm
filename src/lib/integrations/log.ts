import "server-only";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type {
  IntegrationDirection,
  IntegrationLogStatus,
  IntegrationRelatedEntityType,
  IntegrationType,
  Json,
} from "@/lib/supabase/database.types";

/**
 * Webhook受信ログ(DB_SCHEMA.md integration_logs)。
 * Webhook呼び出し元(freee/クラウドサイン/Slack/Zoom/フォーム)は
 * Supabase Authのセッションを持たないため、service role権限のadminクライアントで
 * 書き込む(RLSは「authenticated限定」のため、通常クライアントでは弾かれる)。
 */
export async function logIntegrationEvent(params: {
  integrationType: IntegrationType;
  direction: IntegrationDirection;
  relatedEntityType?: IntegrationRelatedEntityType;
  relatedEntityId?: string;
  payload: Json;
  status: IntegrationLogStatus;
  errorMessage?: string;
}): Promise<void> {
  const admin = createSupabaseAdminClient();
  await admin.from("integration_logs").insert({
    integration_type: params.integrationType,
    direction: params.direction,
    related_entity_type: params.relatedEntityType ?? null,
    related_entity_id: params.relatedEntityId ?? null,
    payload: params.payload,
    status: params.status,
    error_message: params.errorMessage ?? null,
  });
}
