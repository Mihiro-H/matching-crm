import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { logIntegrationEvent } from "@/lib/integrations/log";
import { triggerNotification } from "@/lib/slack/notify";
import { parseFormSubmission } from "@/lib/forms/parse-submission";
import { verifySharedSecret } from "@/lib/webhooks/verify-signature";
import type { FormFieldRow } from "@/lib/forms/types";

/**
 * 外部フォームからの問い合わせ受付Webhook(設定 > フォーム管理で構成した項目に対応)。
 * 認証は共有シークレット方式(ヘッダー X-Webhook-Secret を FORM_WEBHOOK_SECRET と比較)。
 * どのフォーム経由かはURLの[formId]で判定し、その時点のform_fields構成に基づいて
 * ペイロードを検証・people(担当者)+deals(商談)の2行へ変換する(parseFormSubmission参照)。
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ formId: string }> }) {
  const secret = process.env.FORM_WEBHOOK_SECRET;
  const provided = request.headers.get("x-webhook-secret");

  if (!secret || !verifySharedSecret(secret, provided)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { formId } = await params;
  const rawBody = await request.text();
  let json: unknown;
  try {
    json = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();
  const { data: fieldRows, error: fieldsError } = await admin
    .from("form_fields")
    .select("*")
    .eq("form_id", formId)
    .order("sort_order", { ascending: true });

  if (fieldsError || !fieldRows || fieldRows.length === 0) {
    return NextResponse.json({ error: "フォームが見つかりません。" }, { status: 404 });
  }

  const fields: FormFieldRow[] = fieldRows.map((row) => ({
    id: row.id,
    fieldKey: row.field_key,
    isBuiltin: row.is_builtin,
    label: row.label,
    answerType: row.answer_type,
    options: Array.isArray(row.options) ? (row.options as { value: string; label: string }[]) : null,
    isRequired: row.is_required,
    sortOrder: row.sort_order,
  }));

  const parsed = parseFormSubmission(fields, json as Record<string, unknown>);
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

  const { data: person, error: personError } = await admin
    .from("people")
    .insert(parsed.data.personInsert)
    .select("id")
    .single();

  if (personError) {
    await logIntegrationEvent({
      integrationType: "form",
      direction: "inbound",
      payload: json as never,
      status: "failed",
      errorMessage: personError.message,
    });
    return NextResponse.json({ error: personError.message }, { status: 500 });
  }

  const { data: deal, error: dealError } = await admin
    .from("deals")
    .insert({
      person_id: person.id,
      ...parsed.data.dealInsert,
      custom_fields: parsed.data.customFields,
      source: "form",
      status: "new",
      form_id: formId,
    })
    .select("id")
    .single();

  if (dealError) {
    await logIntegrationEvent({
      integrationType: "form",
      direction: "inbound",
      payload: json as never,
      status: "failed",
      errorMessage: dealError.message,
    });
    return NextResponse.json({ error: dealError.message }, { status: 500 });
  }

  await logIntegrationEvent({
    integrationType: "form",
    direction: "inbound",
    relatedEntityType: "deal",
    relatedEntityId: deal.id,
    payload: json as never,
    status: "success",
  });

  await triggerNotification(
    "new_lead",
    { company_name: parsed.data.personInsert.company_name_raw ?? parsed.data.personInsert.name },
    { dealId: deal.id }
  );

  return NextResponse.json({ id: deal.id }, { status: 201 });
}
