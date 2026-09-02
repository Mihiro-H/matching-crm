import { NextResponse, type NextRequest } from "next/server";
import { logIntegrationEvent } from "@/lib/integrations/log";
import { verifySlackSignature } from "@/lib/webhooks/verify-signature";

/**
 * Slack Events APIの受信エンドポイント(TECH_STACK.md)。
 * 現時点でSlackから受信したイベントを消費する機能はまだない
 * (通知は常にOrbit→Slackの一方向)。将来的にインタラクティブな機能
 * (ボタン応答等)を追加する場合の受け口として、署名検証とログ記録のみ行う。
 */
export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  let json: unknown;
  try {
    json = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }

  // Slack Events APIのURL検証チャレンジ(公式ドキュメントの標準手順)
  if (typeof json === "object" && json !== null && (json as Record<string, unknown>).type === "url_verification") {
    return NextResponse.json({ challenge: (json as Record<string, unknown>).challenge });
  }

  const signingSecret = process.env.SLACK_SIGNING_SECRET;
  const timestamp = request.headers.get("x-slack-request-timestamp");
  const signature = request.headers.get("x-slack-signature");

  if (!signingSecret || !timestamp || !signature || !verifySlackSignature(signingSecret, timestamp, rawBody, signature)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  await logIntegrationEvent({
    integrationType: "slack",
    direction: "inbound",
    payload: json as never,
    status: "success",
  });

  return NextResponse.json({ ok: true });
}
