import "server-only";
import { revalidatePath } from "next/cache";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getTranscript } from "@/lib/assemblyai/client";
import { summarizeMeetingTranscript } from "@/lib/claude/client";
import { triggerNotification } from "@/lib/slack/notify";
import { buildFlatSummaryExcerpt } from "./summary-excerpt";

type SupabaseAdminClient = ReturnType<typeof createSupabaseAdminClient>;

export type CompleteUploadResult =
  | { status: "processing" }
  | { status: "completed"; meetingNoteId: string }
  | { status: "failed"; error: string };

/**
 * 議事録アップロードの完了確認〜議事録作成〜通知までの共通処理。
 * 呼び出し元が2つある: (1) upload-actions.tsのポーリング(ブラウザがアップロード画面を
 * 開いたままの場合の即時反映用)、(2) AssemblyAI Webhook(ブラウザが画面を離れていても
 * 完了/失敗を検知するための経路、webhooks/assemblyai/route.ts参照)。
 * どちらが先に完了させても安全なよう、既にcompleted/failedの行は早期リターンして
 * 二重に議事録を作成したり二重通知したりしない。
 * RLSに縛られず両経路から同じように呼べるよう、常にadminクライアントを使う
 * (meeting_note_uploads/meeting_notesはauthenticated_full_accessのため、
 * 権限チェックは呼び出し元(requireEditAccessまたはWebhookの共有シークレット)で行う)。
 */
export async function completeMeetingNoteUpload(uploadId: string): Promise<CompleteUploadResult> {
  const admin = createSupabaseAdminClient();

  const { data: uploadRow, error: fetchError } = await admin
    .from("meeting_note_uploads")
    .select("*")
    .eq("id", uploadId)
    .maybeSingle();

  if (fetchError || !uploadRow) {
    return { status: "failed", error: fetchError?.message ?? "アップロードが見つかりません。" };
  }
  if (uploadRow.status === "completed" && uploadRow.meeting_note_id) {
    return { status: "completed", meetingNoteId: uploadRow.meeting_note_id };
  }
  if (uploadRow.status === "failed") {
    return { status: "failed", error: uploadRow.error_message ?? "処理に失敗しました。" };
  }
  if (!uploadRow.assemblyai_transcript_id) return { status: "processing" };

  const assemblyAiKey = process.env.ASSEMBLYAI_API_KEY;
  if (!assemblyAiKey) {
    const message = "ASSEMBLYAI_API_KEYが未設定です。";
    await markFailed(admin, uploadId, message);
    await notifyUploader(uploadRow, { ok: false });
    return { status: "failed", error: message };
  }

  try {
    const result = await getTranscript(assemblyAiKey, uploadRow.assemblyai_transcript_id);
    if (!result.ok) {
      await markFailed(admin, uploadId, result.error);
      await notifyUploader(uploadRow, { ok: false });
      return { status: "failed", error: result.error };
    }
    if (result.status !== "completed") return { status: "processing" };

    // 要約はClaude API経由(要点/決議事項/ネクストアクションの3分類。AssemblyAIの
    // ビルトイン要約・LeMURは日本語での実用精度が不十分だったため切り替えた)。
    // 要約自体が失敗しても文字起こし結果は既に得られているため、議事録作成は止めない
    // (sectionsをnullのままにし、詳細画面は文字起こし冒頭のフォールバック表示に倒れる)。
    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    const summaryResult = anthropicKey
      ? await summarizeMeetingTranscript(anthropicKey, result.text)
      : { ok: false as const, error: "ANTHROPIC_API_KEYが未設定です。" };
    const sections = summaryResult.ok ? summaryResult.sections : null;

    const { data: note, error: insertError } = await admin
      .from("meeting_notes")
      .insert({
        title: uploadRow.title,
        meeting_at: uploadRow.meeting_at,
        source: "upload",
        project_id: uploadRow.project_id,
        deal_id: uploadRow.deal_id,
        ai_summary: buildFlatSummaryExcerpt(sections, result.text),
        ai_summary_sections: sections,
        transcript_text: result.text,
        action_items: [],
        created_by: uploadRow.created_by,
      })
      .select("id")
      .single();

    if (insertError) {
      await markFailed(admin, uploadId, insertError.message);
      await notifyUploader(uploadRow, { ok: false });
      return { status: "failed", error: insertError.message };
    }

    await admin.from("meeting_note_uploads").update({ status: "completed", meeting_note_id: note.id }).eq("id", uploadId);

    revalidatePath("/meeting-notes");
    await notifyUploader(uploadRow, { ok: true, meetingNoteId: note.id });
    return { status: "completed", meetingNoteId: note.id };
  } catch (cause) {
    // getTranscript/summarizeMeetingTranscriptのfetchがネットワーク瞬断等で例外を
    // 投げた場合の保険(ポーリング/Webhookどちらの呼び出し元でも、ここでcatchしないと
    // 500やWebhook処理失敗としてしか見えず、原因の特定もできなくなる)。
    const message = cause instanceof Error ? cause.message : String(cause);
    await markFailed(admin, uploadId, message);
    await notifyUploader(uploadRow, { ok: false });
    return { status: "failed", error: message };
  }
}

async function markFailed(admin: SupabaseAdminClient, uploadId: string, message: string): Promise<void> {
  await admin.from("meeting_note_uploads").update({ status: "failed", error_message: message }).eq("id", uploadId);
}

async function notifyUploader(
  uploadRow: { title: string; created_by: string },
  outcome: { ok: true; meetingNoteId: string } | { ok: false }
): Promise<void> {
  if (outcome.ok) {
    await triggerNotification(
      "meeting_note_ready",
      { title: uploadRow.title },
      { uploadedByUserId: uploadRow.created_by, meetingNoteId: outcome.meetingNoteId }
    );
  } else {
    await triggerNotification(
      "meeting_note_failed",
      { title: uploadRow.title },
      { uploadedByUserId: uploadRow.created_by }
    );
  }
}
