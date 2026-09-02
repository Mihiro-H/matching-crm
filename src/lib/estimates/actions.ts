"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireEditAccess } from "@/lib/auth/require-edit";
import { createAndSendCloudSignDocument } from "@/lib/cloudsign/client";
import { getCloudSignConfig } from "@/lib/cloudsign/config";
import { logIntegrationEvent } from "@/lib/integrations/log";
import type { EstimateDocumentType } from "@/lib/supabase/database.types";

export type CreateEstimateResult = { success: true; id: string } | { success: false; error: string };

const DOCUMENT_TYPE_LABELS: Record<EstimateDocumentType, string> = {
  estimate: "見積書",
  order: "発注書",
};

/**
 * 「クラウドサインで送付」(SCREEN_SPEC.md 5章)。
 * view権限のユーザーはこの操作を行えない(SCREEN_SPEC.md「権限: viewは送付操作不可」)。
 */
export async function createAndSendEstimate(input: {
  projectId: string;
  documentType: EstimateDocumentType;
  amount: number;
  signerEmail: string;
  signerName: string;
}): Promise<CreateEstimateResult> {
  const authCheck = await requireEditAccess("estimates");
  if (!authCheck.ok) return { success: false, error: authCheck.error };

  const signerEmail = input.signerEmail.trim();
  const signerName = input.signerName.trim();
  if (!signerEmail) {
    return { success: false, error: "宛先メールアドレスを入力してください。" };
  }
  if (!signerName) {
    return { success: false, error: "宛先氏名を入力してください。" };
  }

  const cloudSignConfig = getCloudSignConfig(input.documentType);
  if (!cloudSignConfig) {
    return {
      success: false,
      error:
        "クラウドサイン連携が未設定です。管理者にCLOUDSIGN_CLIENT_ID / " +
        "CLOUDSIGN_TEMPLATE_ID_ESTIMATE(またはORDER) の設定を依頼してください。",
    };
  }

  const supabase = await createSupabaseServerClient();
  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("id, title, company_id, company:companies(name)")
    .eq("id", input.projectId)
    .maybeSingle();

  if (projectError || !project) {
    return { success: false, error: projectError?.message ?? "案件が見つかりません。" };
  }

  const title = `${DOCUMENT_TYPE_LABELS[input.documentType]} - ${project.company?.name ?? ""} - ${project.title}`;

  const cloudSignResult = await createAndSendCloudSignDocument(
    { templateId: cloudSignConfig.templateId, title, signerEmail, signerName },
    { clientId: cloudSignConfig.clientId, env: cloudSignConfig.env }
  );

  await logIntegrationEvent({
    integrationType: "cloudsign",
    direction: "outbound",
    relatedEntityType: "project",
    relatedEntityId: project.id,
    payload: { title, signerEmail, result: cloudSignResult } as never,
    status: cloudSignResult.ok ? "success" : "failed",
    errorMessage: cloudSignResult.ok ? undefined : cloudSignResult.error,
  });

  if (!cloudSignResult.ok) {
    return { success: false, error: cloudSignResult.error };
  }

  const { data, error } = await supabase
    .from("estimates")
    .insert({
      project_id: input.projectId,
      document_type: input.documentType,
      amount: input.amount,
      contract_status: "sent",
      sent_at: new Date().toISOString(),
      cloudsign_document_id: cloudSignResult.documentId,
    })
    .select("id")
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  // 次回以降フォームの初期値として使えるよう、送付先を企業に記憶しておく
  // (getProjectSigningInfo参照。失敗しても送付自体は完了しているので握りつぶす)
  await supabase.from("companies").update({ esignature_email: signerEmail }).eq("id", project.company_id);

  revalidatePath("/estimates");
  return { success: true, id: data.id };
}
