import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { logIntegrationEvent } from "@/lib/integrations/log";
import { triggerNotification } from "@/lib/slack/notify";
import { parseCloudSignEvent } from "@/lib/webhooks/parse-cloudsign-event";
import { verifySharedSecret } from "@/lib/webhooks/verify-signature";

/**
 * クラウドサインWebhook(SCREEN_SPEC.md 5章)。
 * 「signed」になった場合、該当estimatesとprojectのステータスを自動更新する
 * (project.statusをcontractedへ遷移させる手動ドラッグ不可の仕様の裏側)。
 *
 * 認証は共有シークレット方式(暫定)。クラウドサイン公式の署名検証方式が
 * 確認でき次第、verifySharedSecretを適切な実装に置き換えること。
 */
export async function POST(request: NextRequest) {
  const secret = process.env.CLOUDSIGN_WEBHOOK_SECRET;
  const provided = request.headers.get("x-webhook-secret");

  if (!secret || !verifySharedSecret(secret, provided)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const rawBody = await request.text();
  let json: unknown;
  try {
    json = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }

  const parsed = parseCloudSignEvent(json);
  if (!parsed.ok) {
    await logIntegrationEvent({
      integrationType: "cloudsign",
      direction: "inbound",
      payload: json as never,
      status: "failed",
      errorMessage: parsed.error,
    });
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();
  const { data: estimate, error: findError } = await admin
    .from("estimates")
    .select("id, project_id")
    .eq("cloudsign_document_id", parsed.data.documentId)
    .maybeSingle();

  if (findError || !estimate) {
    await logIntegrationEvent({
      integrationType: "cloudsign",
      direction: "inbound",
      payload: json as never,
      status: "failed",
      errorMessage: findError?.message ?? "該当するestimateが見つかりません",
    });
    return NextResponse.json({ error: "estimate not found" }, { status: 404 });
  }

  if (parsed.data.status === "ignored") {
    await logIntegrationEvent({
      integrationType: "cloudsign",
      direction: "inbound",
      relatedEntityType: "estimate",
      relatedEntityId: estimate.id,
      payload: json as never,
      status: "success",
    });
    return NextResponse.json({ ok: true });
  }

  if (parsed.data.status === "signed") {
    await admin
      .from("estimates")
      .update({ contract_status: "signed", signed_at: new Date().toISOString() })
      .eq("id", estimate.id);

    // SCREEN_SPEC.md 5章: signedになると該当project.statusが自動的にcontractedへ遷移する
    await admin.from("projects").update({ status: "contracted" }).eq("id", estimate.project_id);

    const { data: project } = await admin
      .from("projects")
      .select("title, company:companies(name)")
      .eq("id", estimate.project_id)
      .maybeSingle();

    await triggerNotification("contract_signed", {
      company_name: project?.company?.name ?? "",
      project_title: project?.title ?? "",
    });
  } else {
    await admin.from("estimates").update({ contract_status: "rejected" }).eq("id", estimate.id);
  }

  await logIntegrationEvent({
    integrationType: "cloudsign",
    direction: "inbound",
    relatedEntityType: "estimate",
    relatedEntityId: estimate.id,
    payload: json as never,
    status: "success",
  });

  return NextResponse.json({ ok: true });
}
