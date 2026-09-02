import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { logIntegrationEvent } from "@/lib/integrations/log";
import { computeZoomChallengeResponse } from "@/lib/webhooks/verify-signature";

/**
 * Zoom Webhook(SCREEN_SPEC.md 6章「議事録」)。
 *
 * TODO(AI要約未実装): 文字起こし完了イベントを受けてmeeting_notesの行は作成するが、
 * AI要約(ai_summary)は実際のAI/LLM連携が必要で、そのプロバイダ選定・非同期実行方式
 * (キュー等)はTECH_STACK.mdで「別途検討が必要」と明記されている未確定事項のため、
 * ここではプレースホルダー文言を入れるのみに留める。プロバイダ確定後、
 * このWebhookから直接呼ぶか、キュー経由の非同期ジョブに置き換えること。
 */
export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  let json: unknown;
  try {
    json = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }

  const record = typeof json === "object" && json !== null ? (json as Record<string, unknown>) : {};

  // Zoom Webhookの「URL Validation」チャレンジ応答(公式ドキュメントの標準手順)
  if (record.event === "endpoint.url_validation") {
    const secretToken = process.env.ZOOM_WEBHOOK_SECRET_TOKEN;
    const payload = record.payload as Record<string, unknown> | undefined;
    const plainToken = typeof payload?.plainToken === "string" ? payload.plainToken : null;

    if (!secretToken || !plainToken) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    return NextResponse.json({
      plainToken,
      encryptedToken: computeZoomChallengeResponse(secretToken, plainToken),
    });
  }

  // 通常イベントの認証(Zoomはヘッダー authorization に secret token をそのまま載せる方式)
  const secretToken = process.env.ZOOM_WEBHOOK_SECRET_TOKEN;
  const provided = request.headers.get("authorization");
  if (!secretToken || provided !== secretToken) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  if (record.event !== "recording.transcript_completed") {
    await logIntegrationEvent({
      integrationType: "zoom",
      direction: "inbound",
      payload: json as never,
      status: "success",
    });
    return NextResponse.json({ ok: true });
  }

  const payload = record.payload as { object?: Record<string, unknown> } | undefined;
  const meetingObject = payload?.object ?? {};
  const topic = typeof meetingObject.topic === "string" ? meetingObject.topic : "Zoom会議";
  const startTime =
    typeof meetingObject.start_time === "string" ? meetingObject.start_time : new Date().toISOString();
  const transcriptUrl =
    typeof meetingObject.transcript_url === "string" ? meetingObject.transcript_url : null;

  // meeting_notes.created_by は NOT NULL の users.id 外部キーのため、
  // Zoom起因で自動生成する行にも実在するユーザーを割り当てる必要がある。
  // 運用上「システム用ユーザー」のpublic.users行を1つ作成し、そのidを
  // SYSTEM_USER_IDに設定しておくこと。
  const systemUserId = process.env.SYSTEM_USER_ID;
  if (!systemUserId) {
    await logIntegrationEvent({
      integrationType: "zoom",
      direction: "inbound",
      payload: json as never,
      status: "failed",
      errorMessage: "SYSTEM_USER_IDが未設定のため議事録を作成できません。",
    });
    return NextResponse.json({ error: "SYSTEM_USER_ID not configured" }, { status: 500 });
  }

  const admin = createSupabaseAdminClient();
  const { data: note, error } = await admin
    .from("meeting_notes")
    .insert({
      title: topic,
      meeting_at: startTime,
      source: "zoom",
      transcript_url: transcriptUrl,
      ai_summary: "(AI要約は準備中です。連携実装後に自動生成されます)",
      action_items: [],
      created_by: systemUserId,
    })
    .select("id")
    .single();

  await logIntegrationEvent({
    integrationType: "zoom",
    direction: "inbound",
    relatedEntityType: error ? undefined : "meeting_note",
    relatedEntityId: note?.id,
    payload: json as never,
    status: error ? "failed" : "success",
    errorMessage: error?.message,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, meetingNoteId: note.id });
}
