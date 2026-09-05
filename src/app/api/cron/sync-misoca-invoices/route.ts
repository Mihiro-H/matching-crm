import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { verifySharedSecret } from "@/lib/webhooks/verify-signature";
import { getValidMisocaAccessToken } from "@/lib/misoca/token-store";
import { getInvoice } from "@/lib/misoca/client";
import { logIntegrationEvent } from "@/lib/integrations/log";
import { triggerNotification } from "@/lib/slack/notify";
import { formatCurrencyJPY } from "@/lib/format";

/**
 * 精算管理の入金状況同期(SCREEN_SPEC.md 7章)。Vercel Cronから定期的に呼ばれる想定。
 * MisocaにはWebhookが無く、入金確認はこちらからAPIで能動的に取りに行く必要があるため、
 * 未入金の請求書を毎回ポーリングして入金済みかどうかを確認する
 * (Google Drive議事録取り込み・レポート定期実行と同じrun-reportsのCron認証パターン)。
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  const provided = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!secret || !verifySharedSecret(secret, provided)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const tokenResult = await getValidMisocaAccessToken();
  if (!tokenResult.ok) {
    return NextResponse.json({ error: tokenResult.error }, { status: 502 });
  }

  const admin = createSupabaseAdminClient();
  const { data: pendingInvoices, error } = await admin
    .from("invoices")
    .select("id, project_id, amount, misoca_invoice_id, project:projects(title, company:companies(name))")
    .not("misoca_invoice_id", "is", null)
    .in("payment_status", ["invoiced", "unpaid"]);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let updatedCount = 0;

  for (const invoice of pendingInvoices ?? []) {
    if (!invoice.misoca_invoice_id) continue;

    const result = await getInvoice(tokenResult.accessToken, invoice.misoca_invoice_id);
    if (!result.ok) {
      await logIntegrationEvent({
        integrationType: "misoca",
        direction: "inbound",
        relatedEntityType: "invoice",
        relatedEntityId: invoice.id,
        payload: { error: result.error } as never,
        status: "failed",
        errorMessage: result.error,
      });
      continue;
    }

    if (result.paymentStatus !== 1) continue; // まだ未入金。次回のcronで再確認する

    await admin
      .from("invoices")
      .update({ payment_status: "paid", paid_at: new Date().toISOString() })
      .eq("id", invoice.id);

    await logIntegrationEvent({
      integrationType: "misoca",
      direction: "inbound",
      relatedEntityType: "invoice",
      relatedEntityId: invoice.id,
      payload: { paymentStatus: result.paymentStatus } as never,
      status: "success",
    });

    await triggerNotification(
      "payment_confirmed",
      {
        company_name: invoice.project?.company?.name ?? "",
        project_title: invoice.project?.title ?? "",
        amount: formatCurrencyJPY(invoice.amount),
      },
      { projectId: invoice.project_id }
    );

    updatedCount++;
  }

  return NextResponse.json({ checked: pendingInvoices?.length ?? 0, updated: updatedCount });
}
