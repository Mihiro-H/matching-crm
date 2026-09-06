import { NextResponse, type NextRequest } from "next/server";
import { submitFormSubmission } from "@/lib/forms/submit-form";
import { verifySharedSecret } from "@/lib/webhooks/verify-signature";

/**
 * 外部ドメインで公開するフォームからの問い合わせ受付Webhook
 * (設定 > フォーム管理で構成した項目に対応)。
 * 認証は共有シークレット方式(ヘッダー X-Webhook-Secret を FORM_WEBHOOK_SECRET と比較)。
 * CRM内蔵の公開フォーム(/contact/[formId])はServer Actionから直接
 * submitFormSubmissionを呼ぶため、こちらのWebhookは経由しない。
 * 検証・保存の実処理はsubmit-form.tsに共通化している。
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

  const result = await submitFormSubmission(formId, json as Record<string, unknown>);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ id: result.dealId }, { status: 201 });
}
