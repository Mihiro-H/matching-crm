"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { EstimateDocumentType } from "@/lib/supabase/database.types";

export type CreateEstimateResult = { success: true; id: string } | { success: false; error: string };

/**
 * 「クラウドサインで送付」(SCREEN_SPEC.md 5章)。
 *
 * TODO(cloudsign連携未実装): 実際のクラウドサインAPI呼び出しは行っておらず、
 * cloudsign_document_idはプレースホルダーを発行するだけのスタブ。
 * フェーズC(Webhook受信)で本実装に置き換える。
 *
 * TODO(permissions): view権限のユーザーはこの操作を行えない
 * (SCREEN_SPEC.md「権限: viewは送付操作不可」)。認証実装後に追加する。
 */
export async function createAndSendEstimate(input: {
  projectId: string;
  documentType: EstimateDocumentType;
  amount: number;
}): Promise<CreateEstimateResult> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("estimates")
    .insert({
      project_id: input.projectId,
      document_type: input.documentType,
      amount: input.amount,
      contract_status: "sent",
      sent_at: new Date().toISOString(),
      cloudsign_document_id: `stub-${crypto.randomUUID()}`,
    })
    .select("id")
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/estimates");
  return { success: true, id: data.id };
}
