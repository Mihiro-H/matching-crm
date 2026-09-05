"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireEditAccess } from "@/lib/auth/require-edit";
import { createAndSendCloudSignDocumentFromFile } from "@/lib/cloudsign/client";
import { getCloudSignConfig } from "@/lib/cloudsign/config";
import { getValidMisocaAccessToken } from "@/lib/misoca/token-store";
import {
  createDeliverySlip,
  createEstimate,
  getDeliverySlipPdf,
  getEstimatePdf,
  type GetPdfResult,
} from "@/lib/misoca/client";
import { getOrCreateMisocaContact } from "@/lib/misoca/contact-group";
import { logIntegrationEvent } from "@/lib/integrations/log";
import type { EstimateDocumentType } from "@/lib/supabase/database.types";

export type CreateEstimateResult = { success: true; id: string } | { success: false; error: string };

const DOCUMENT_TYPE_LABELS: Record<EstimateDocumentType, string> = {
  estimate: "見積書",
  delivery_slip: "納品書",
};

type ProjectForDocument = {
  id: string;
  title: string;
  companyId: string;
  companyName: string;
  misocaContactGroupId: string | null;
  misocaContactId: string | null;
};

async function getProjectForDocument(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  projectId: string
): Promise<{ ok: true; project: ProjectForDocument } | { ok: false; error: string }> {
  const { data: project, error } = await supabase
    .from("projects")
    .select("id, title, company_id, company:companies(name, misoca_contact_group_id, misoca_contact_id)")
    .eq("id", projectId)
    .maybeSingle();

  if (error || !project) {
    return { ok: false, error: error?.message ?? "案件が見つかりません。" };
  }

  return {
    ok: true,
    project: {
      id: project.id,
      title: project.title,
      companyId: project.company_id,
      companyName: project.company?.name ?? "",
      misocaContactGroupId: project.company?.misoca_contact_group_id ?? null,
      misocaContactId: project.company?.misoca_contact_id ?? null,
    },
  };
}

/**
 * document_typeに応じてMisocaの見積書API/納品書APIのどちらを呼ぶかを切り替える。
 * 納品書はMisoca上も POST /delivery_slip という独立したエンドポイントのため、
 * 見積書と同じ関数では作成できない(SCREEN_SPEC.md 5章)。
 */
async function createMisocaDocument(
  accessToken: string,
  documentType: EstimateDocumentType,
  input: { contactId: string; issueDate: string; subject: string; amount: number; itemName: string }
): Promise<{ ok: true; documentId: string } | { ok: false; error: string }> {
  const items = [
    { name: input.itemName, quantity: 1, unitPrice: input.amount, taxType: "STANDARD_TAX_10" as const },
  ];

  if (documentType === "delivery_slip") {
    const result = await createDeliverySlip(accessToken, {
      contactId: input.contactId,
      issueDate: input.issueDate,
      subject: input.subject,
      items,
    });
    return result.ok ? { ok: true, documentId: result.deliverySlipId } : result;
  }

  const result = await createEstimate(accessToken, {
    contactId: input.contactId,
    issueDate: input.issueDate,
    subject: input.subject,
    items,
  });
  return result.ok ? { ok: true, documentId: result.estimateId } : result;
}

function getMisocaDocumentPdf(
  accessToken: string,
  documentType: EstimateDocumentType,
  documentId: string
): Promise<GetPdfResult> {
  return documentType === "delivery_slip"
    ? getDeliverySlipPdf(accessToken, documentId)
    : getEstimatePdf(accessToken, documentId);
}

export type CreateEstimateDraftResult =
  | { success: true; misocaDocumentId: string; title: string; pdfBase64: string }
  | { success: false; error: string };

/**
 * 「PDFプレビュー」(SCREEN_SPEC.md 5章)。Misocaで実際に見積書/納品書を作成し、PDFを取得する。
 * この時点ではOrbit側のestimates行はまだ作らない(あくまで下書き)。
 * PDFはブラウザへ直接プロキシせず、いったんbase64でクライアントへ返して
 * <embed>やダウンロードに使う(ファイルサイズが大きい場合は将来的に見直す)。
 *
 * 件名(subject)は案件名のみとする(SCREEN_SPEC.md: 実際の書類の件名には案件名だけを
 * 記載する。会社名や書類種別まで含めると実務上の書類として不自然なため)。
 */
export async function createEstimateDraft(input: {
  projectId: string;
  documentType: EstimateDocumentType;
  amount: number;
}): Promise<CreateEstimateDraftResult> {
  const authCheck = await requireEditAccess("estimates");
  if (!authCheck.ok) return { success: false, error: authCheck.error };

  if (input.amount <= 0) {
    return { success: false, error: "金額を入力してください。" };
  }

  const tokenResult = await getValidMisocaAccessToken();
  if (!tokenResult.ok) return { success: false, error: tokenResult.error };

  const supabase = await createSupabaseServerClient();
  const projectResult = await getProjectForDocument(supabase, input.projectId);
  if (!projectResult.ok) return { success: false, error: projectResult.error };
  const { project } = projectResult;

  const contactResult = await getOrCreateMisocaContact(supabase, tokenResult.accessToken, {
    id: project.companyId,
    name: project.companyName || "取引先",
    misocaContactGroupId: project.misocaContactGroupId,
    misocaContactId: project.misocaContactId,
  });
  if (!contactResult.ok) return { success: false, error: contactResult.error };

  const documentResult = await createMisocaDocument(tokenResult.accessToken, input.documentType, {
    contactId: contactResult.contactId,
    issueDate: new Date().toISOString().slice(0, 10),
    subject: project.title,
    amount: input.amount,
    itemName: project.title,
  });

  await logIntegrationEvent({
    integrationType: "misoca",
    direction: "outbound",
    relatedEntityType: "project",
    relatedEntityId: project.id,
    payload: { step: "createMisocaDocument", documentType: input.documentType, result: documentResult } as never,
    status: documentResult.ok ? "success" : "failed",
    errorMessage: documentResult.ok ? undefined : documentResult.error,
  });

  if (!documentResult.ok) return { success: false, error: documentResult.error };

  const pdfResult = await getMisocaDocumentPdf(tokenResult.accessToken, input.documentType, documentResult.documentId);
  if (!pdfResult.ok) return { success: false, error: pdfResult.error };

  const pdfBase64 = Buffer.from(pdfResult.pdf).toString("base64");
  // タイトルはUI表示用(ダイアログ見出し・ダウンロードファイル名)に「種別 - 案件名」を保つ。
  // Misoca書類自体のsubjectは案件名のみ(project.title)で作成済み。
  const title = `${DOCUMENT_TYPE_LABELS[input.documentType]} - ${project.title}`;
  return { success: true, misocaDocumentId: documentResult.documentId, title, pdfBase64 };
}

/**
 * 「クラウドサインで送付」。createEstimateDraftで作成済みのMisoca見積書PDFを
 * クラウドサインへアップロードして送付する。
 * 納品書は押印・署名を要する運用ではないため、クラウドサイン送付の対象外
 * (SCREEN_SPEC.md 5章。フォーム側もdocument_type='estimate'のときのみボタンを表示するが、
 * 迂回されても安全なようサーバー側でも拒否する)。
 */
export async function sendEstimateViaCloudSign(input: {
  projectId: string;
  documentType: EstimateDocumentType;
  amount: number;
  misocaDocumentId: string;
  title: string;
  signerEmail: string;
  signerName: string;
}): Promise<CreateEstimateResult> {
  const authCheck = await requireEditAccess("estimates");
  if (!authCheck.ok) return { success: false, error: authCheck.error };

  if (input.documentType !== "estimate") {
    return { success: false, error: "納品書はクラウドサインでの送付に対応していません。" };
  }

  const signerEmail = input.signerEmail.trim();
  const signerName = input.signerName.trim();
  if (!signerEmail) return { success: false, error: "宛先メールアドレスを入力してください。" };
  if (!signerName) return { success: false, error: "宛先氏名を入力してください。" };

  const cloudSignConfig = getCloudSignConfig();
  if (!cloudSignConfig) {
    return {
      success: false,
      error: "クラウドサイン連携が未設定です。管理者にCLOUDSIGN_CLIENT_ID等の設定を依頼してください。",
    };
  }

  const tokenResult = await getValidMisocaAccessToken();
  if (!tokenResult.ok) return { success: false, error: tokenResult.error };

  const pdfResult = await getEstimatePdf(tokenResult.accessToken, input.misocaDocumentId);
  if (!pdfResult.ok) return { success: false, error: pdfResult.error };

  const cloudSignResult = await createAndSendCloudSignDocumentFromFile(
    { fileBytes: pdfResult.pdf, fileName: `${input.title}.pdf`, title: input.title, signerEmail, signerName },
    { clientId: cloudSignConfig.clientId, env: cloudSignConfig.env }
  );

  await logIntegrationEvent({
    integrationType: "cloudsign",
    direction: "outbound",
    relatedEntityType: "project",
    relatedEntityId: input.projectId,
    payload: { title: input.title, signerEmail, result: cloudSignResult } as never,
    status: cloudSignResult.ok ? "success" : "failed",
    errorMessage: cloudSignResult.ok ? undefined : cloudSignResult.error,
  });

  if (!cloudSignResult.ok) return { success: false, error: cloudSignResult.error };

  return insertEstimateRow(input, { cloudsignDocumentId: cloudSignResult.documentId, signerEmail });
}

/** 「PDFをダウンロードして手動送付」。CloudSignを経由せず、送付済みとして記録する。 */
export async function markEstimateSentManually(input: {
  projectId: string;
  documentType: EstimateDocumentType;
  amount: number;
  misocaDocumentId: string;
}): Promise<CreateEstimateResult> {
  const authCheck = await requireEditAccess("estimates");
  if (!authCheck.ok) return { success: false, error: authCheck.error };

  return insertEstimateRow(input, { cloudsignDocumentId: null, signerEmail: null });
}

async function insertEstimateRow(
  input: { projectId: string; documentType: EstimateDocumentType; amount: number; misocaDocumentId: string },
  extra: { cloudsignDocumentId: string | null; signerEmail: string | null }
): Promise<CreateEstimateResult> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("estimates")
    .insert({
      project_id: input.projectId,
      document_type: input.documentType,
      amount: input.amount,
      contract_status: "sent",
      sent_at: new Date().toISOString(),
      cloudsign_document_id: extra.cloudsignDocumentId,
      misoca_document_id: input.misocaDocumentId,
    })
    .select("id, project_id")
    .single();

  if (error) return { success: false, error: error.message };

  const { data: project } = await supabase
    .from("projects")
    .select("company_id, deal_id")
    .eq("id", data.project_id)
    .maybeSingle();

  if (extra.signerEmail && project) {
    // 次回以降フォームの初期値として使えるよう、送付先を企業に記憶しておく
    // (getProjectDocumentInfo参照。失敗しても送付自体は完了しているので握りつぶす)
    await supabase.from("companies").update({ esignature_email: extra.signerEmail }).eq("id", project.company_id);
  }

  if (input.documentType === "estimate" && project?.deal_id) {
    // 商談管理「見積提出済」への自動遷移(手動では選べない。deals/status.ts参照)。
    // stale_estimate_notified_atもnullへ戻し、この見積についてまた30日後に
    // 再判定できるようにする(check-stale-estimates cron参照)。lostの商談は
    // 触らない(既に終端に達しているため)。
    await supabase
      .from("deals")
      .update({
        status: "estimate_submitted",
        estimate_submitted_at: new Date().toISOString(),
        stale_estimate_notified_at: null,
      })
      .eq("id", project.deal_id)
      .neq("status", "lost");
  }

  revalidatePath("/estimates");
  return { success: true, id: data.id };
}
