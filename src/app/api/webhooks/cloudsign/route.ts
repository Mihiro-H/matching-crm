import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { logIntegrationEvent } from "@/lib/integrations/log";
import { triggerNotification } from "@/lib/slack/notify";
import { parseCloudSignEvent } from "@/lib/webhooks/parse-cloudsign-event";
import { verifySharedSecret } from "@/lib/webhooks/verify-signature";
import { isFromCloudSignIpRange } from "@/lib/webhooks/cloudsign-ip-allowlist";

/**
 * クラウドサインWebhook(SCREEN_SPEC.md 5章)。
 * 「signed」になった場合、該当estimatesとprojectのステータスを自動更新する
 * (project.statusをcontractedへ遷移させる手動ドラッグ不可の仕様の裏側)。
 *
 * 認証は「URLクエリパラメータの共有シークレット」+「送信元IPアローリスト」の二重防御。
 * クラウドサインはWebhook送信時にカスタムヘッダーを付与する機能を提供していない
 * (公式ヘルプ「Webhook 機能」で確認済み。送るのはContent-Type/User-Agentのみ)ため、
 * クラウドサイン側の通知先設定画面に登録するURL自体に ?secret=... を埋め込んで照合する。
 * ただしURLはアクセスログ等に残りうるため、それだけでは不十分と判断し、公式ヘルプ
 * 「Webhook実行時の挙動」に記載の送信元固定IP(isFromCloudSignIpRange)も必須条件にする。
 * URLが漏れてもIPが一致しなければ通らない。
 *
 * IP取得元は`x-forwarded-for`ではなく`x-vercel-forwarded-for`を使う。標準の
 * `x-forwarded-for`はクライアントが自由な値を送りつけられ、Vercelが必ず上書き/除去する
 * とは限らないため、先頭要素だけを信頼するとなりすましの余地がある(実際に自動セキュリティ
 * レビューで指摘された)。`x-vercel-forwarded-for`はVercelのエッジが設定する値で、
 * クライアント側からは偽装できない。そのためこのIPチェックはVercelへのデプロイ前提。
 */
export async function POST(request: NextRequest) {
  const secret = process.env.CLOUDSIGN_WEBHOOK_SECRET;
  const provided = request.nextUrl.searchParams.get("secret");
  const env = process.env.CLOUDSIGN_ENV === "production" ? "production" : "sandbox";
  const forwardedFor = request.headers.get("x-vercel-forwarded-for");

  if (!secret || !verifySharedSecret(secret, provided) || !isFromCloudSignIpRange(forwardedFor, env)) {
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

  if (parsed.data.status === "unknown") {
    // 未確認のstatusコード。誤ってestimateの状態を変えるより、ログに残して
    // 何もしない方が安全(parse-cloudsign-event.tsのコメント参照)。
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
