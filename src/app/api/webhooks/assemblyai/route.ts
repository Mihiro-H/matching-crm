import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { verifySharedSecret } from "@/lib/webhooks/verify-signature";
import { completeMeetingNoteUpload } from "@/lib/meeting-notes/complete-upload";

/**
 * AssemblyAI Webhook(公式ドキュメント「Webhooks」)。
 * 文字起こし(+要約)の完了/失敗時にAssemblyAIから呼ばれる。
 * ブラウザがアップロード画面を開いたままの場合はクライアント側ポーリング
 * (upload-actions.ts)が先に完了を検知するが、画面を離れた/閉じた場合でも
 * ここで検知して議事録作成〜通知(meeting_note_ready/meeting_note_failed)まで
 * 完了させる。実処理はcomplete-upload.tsに共通化しており、ポーリングと同じ関数を
 * 呼ぶだけ(どちらが先でも二重処理にならない)。
 *
 * 認証: 文字起こし依頼時(upload-actions.ts)にwebhook_auth_header_name/valueとして
 * 指定した共有シークレットを、AssemblyAIがコールバック時に同じヘッダーで送り返してくる
 * (公式ドキュメント記載の認証方式)。
 */
export async function POST(request: NextRequest) {
  const secret = process.env.ASSEMBLYAI_WEBHOOK_SECRET;
  const provided = request.headers.get("x-webhook-secret");
  if (!secret || !verifySharedSecret(secret, provided)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as { transcript_id?: string } | null;
  const transcriptId = body?.transcript_id;
  if (!transcriptId) {
    return NextResponse.json({ error: "transcript_id is required" }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();
  const { data: uploadRow } = await admin
    .from("meeting_note_uploads")
    .select("id")
    .eq("assemblyai_transcript_id", transcriptId)
    .maybeSingle();

  if (!uploadRow) {
    // 該当アップロードが見つからない(削除済み等)。AssemblyAI側の再送を
    // 誘発しないよう200で応答しておく。
    return NextResponse.json({ ok: true });
  }

  const result = await completeMeetingNoteUpload(uploadRow.id);
  return NextResponse.json({ result: result.status });
}
