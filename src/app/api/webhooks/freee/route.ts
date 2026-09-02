import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { logIntegrationEvent } from "@/lib/integrations/log";
import { triggerNotification } from "@/lib/slack/notify";
import { parseFreeeEvent } from "@/lib/webhooks/parse-freee-event";
import { verifySharedSecret } from "@/lib/webhooks/verify-signature";

/**
 * freee Webhook(SCREEN_SPEC.md 7章): invoices.payment_statusを自動更新する。
 * Orbit側では編集機能を持たず、金額・入金状況の修正はfreee側で行いWebhook経由で同期する
 * (SCREEN_SPEC.md「確定」事項)。
 *
 * 認証は共有シークレット方式(暫定)。freee公式の署名検証方式が確認でき次第、
 * verifySharedSecretを適切な実装に置き換えること。
 */
export async function POST(request: NextRequest) {
  const secret = process.env.FREEE_WEBHOOK_SECRET;
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

  const parsed = parseFreeeEvent(json);
  if (!parsed.ok) {
    await logIntegrationEvent({
      integrationType: "freee",
      direction: "inbound",
      payload: json as never,
      status: "failed",
      errorMessage: parsed.error,
    });
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();
  const { data: invoice, error: findError } = await admin
    .from("invoices")
    .select("id, project:projects(title), company:companies(name)")
    .eq("freee_invoice_id", parsed.data.invoiceId)
    .maybeSingle();

  if (findError || !invoice) {
    await logIntegrationEvent({
      integrationType: "freee",
      direction: "inbound",
      payload: json as never,
      status: "failed",
      errorMessage: findError?.message ?? "該当するinvoiceが見つかりません",
    });
    return NextResponse.json({ error: "invoice not found" }, { status: 404 });
  }

  if (parsed.data.status !== "ignored") {
    const update: { payment_status: "invoiced" | "paid"; paid_at?: string } = {
      payment_status: parsed.data.status,
    };
    if (parsed.data.status === "paid") {
      update.paid_at = new Date().toISOString();
    }
    await admin.from("invoices").update(update).eq("id", invoice.id);

    if (parsed.data.status === "paid") {
      await triggerNotification("payment_confirmed", {
        company_name: invoice.company?.name ?? "",
        project_title: invoice.project?.title ?? "",
      });
    }
  }

  await logIntegrationEvent({
    integrationType: "freee",
    direction: "inbound",
    relatedEntityType: "invoice",
    relatedEntityId: invoice.id,
    payload: json as never,
    status: "success",
  });

  return NextResponse.json({ ok: true });
}
