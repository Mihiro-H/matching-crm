import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { logIntegrationEvent } from "@/lib/integrations/log";
import { triggerNotification } from "@/lib/slack/notify";
import { parseFormLeadPayload } from "@/lib/webhooks/parse-form-lead";
import { verifySharedSecret } from "@/lib/webhooks/verify-signature";

/**
 * 外部フォームからの問い合わせ受付Webhook(DB_SCHEMA.md contacts、TECH_STACK.md)。
 * 認証は共有シークレット方式(ヘッダー X-Webhook-Secret を FORM_WEBHOOK_SECRET と比較)。
 * 実際のフォーム連携先の認証方式が確定次第、置き換えること。
 */
export async function POST(request: NextRequest) {
  const secret = process.env.FORM_WEBHOOK_SECRET;
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

  const parsed = parseFormLeadPayload(json);
  if (!parsed.ok) {
    await logIntegrationEvent({
      integrationType: "form",
      direction: "inbound",
      payload: json as never,
      status: "failed",
      errorMessage: parsed.error,
    });
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();
  const { data: contact, error } = await admin
    .from("contacts")
    .insert({
      name: parsed.data.name,
      email: parsed.data.email,
      phone: parsed.data.phone,
      company_name_raw: parsed.data.companyNameRaw,
      job_categories: parsed.data.jobCategories,
      inquiry_body: parsed.data.inquiryBody,
      source: "form",
      status: "new",
    })
    .select("id")
    .single();

  if (error) {
    await logIntegrationEvent({
      integrationType: "form",
      direction: "inbound",
      payload: json as never,
      status: "failed",
      errorMessage: error.message,
    });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await logIntegrationEvent({
    integrationType: "form",
    direction: "inbound",
    relatedEntityType: "contact",
    relatedEntityId: contact.id,
    payload: json as never,
    status: "success",
  });

  await triggerNotification("new_lead", {
    company_name: parsed.data.companyNameRaw ?? parsed.data.name,
  });

  return NextResponse.json({ id: contact.id }, { status: 201 });
}
