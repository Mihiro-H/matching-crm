"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireEditAccess } from "@/lib/auth/require-edit";
import { getCurrentUserId } from "@/lib/auth/current-user";
import { requestTranscript, uploadAudio, type TranscriptWebhookConfig } from "@/lib/assemblyai/client";
import { completeMeetingNoteUpload, type CompleteUploadResult } from "./complete-upload";

export type SubmitUploadResult = { success: true; uploadId: string } | { success: false; error: string };

const ASSEMBLYAI_WEBHOOK_HEADER_NAME = "x-webhook-secret";

/**
 * AssemblyAI Webhook設定(完了/失敗をブラウザのポーリング無しでも検知するための経路、
 * webhooks/assemblyai/route.ts参照)。
 * AssemblyAIはwebhook_urlにhttps以外のURL(ローカル開発のhttp://localhost:3000等、
 * 外部から到達不能なURL)を渡すと、文字起こし依頼自体を400で拒否する
 * (実際に発生した不具合。ローカル動作確認中にNEXT_PUBLIC_SITE_URLがhttp://localhostの
 * ままだったため、Webhookフィールドが混入して依頼全体が失敗していた)。
 * そのため、NEXT_PUBLIC_SITE_URLが本番相当(https)でない、またはASSEMBLYAI_WEBHOOK_SECRETが
 * 未設定の環境ではWebhookなしで依頼し、ブラウザのポーリングのみに頼る
 * (misoca/authorize/route.tsのgetMisocaRedirectUri().startsWith("https://")と同じ判定方式)。
 */
function getTranscriptWebhookConfig(): TranscriptWebhookConfig | undefined {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  const secret = process.env.ASSEMBLYAI_WEBHOOK_SECRET;
  if (!siteUrl || !siteUrl.startsWith("https://") || !secret) return undefined;

  return {
    url: `${siteUrl}/api/webhooks/assemblyai`,
    authHeaderName: ASSEMBLYAI_WEBHOOK_HEADER_NAME,
    authHeaderValue: secret,
  };
}

/**
 * 議事録アップロード(SCREEN_SPEC.md 6章)。音声/動画ファイルをAssemblyAIへ送り、
 * 文字起こし・要約を依頼するところまでを行う(完了は非同期。checkMeetingNoteUploadStatus
 * を一定間隔でポーリングして完了を確認する、クライアント側の設計とセットで使う。
 * それとは別に、AssemblyAI側のWebhookでも完了/失敗を検知できるようにしており、
 * アップロード画面を離れてもmeeting_note_ready/meeting_note_failed通知が届く)。
 * 旧Google Drive自動取り込みと同じAssemblyAI呼び出しロジックをそのまま使う。
 */
export async function submitMeetingRecordingUpload(formData: FormData): Promise<SubmitUploadResult> {
  const authCheck = await requireEditAccess("meeting_notes");
  if (!authCheck.ok) return { success: false, error: authCheck.error };

  const title = String(formData.get("title") ?? "").trim();
  const meetingAt = String(formData.get("meetingAt") ?? "").trim();
  const projectId = (formData.get("projectId") as string | null) || null;
  const dealId = (formData.get("dealId") as string | null) || null;
  const file = formData.get("file") as File | null;

  if (!title) return { success: false, error: "タイトルを入力してください。" };
  if (!meetingAt) return { success: false, error: "会議日時を入力してください。" };
  if (!projectId && !dealId) return { success: false, error: "関連する商談または案件を選択してください。" };
  if (projectId && dealId) {
    return { success: false, error: "商談・案件はどちらか一方のみ選択してください。" };
  }
  if (!file || file.size === 0) {
    return { success: false, error: "音声または動画ファイルを選択してください。" };
  }

  const assemblyAiKey = process.env.ASSEMBLYAI_API_KEY;
  if (!assemblyAiKey) {
    return { success: false, error: "ASSEMBLYAI_API_KEYが未設定です。管理者に連携設定を依頼してください。" };
  }

  const currentUserId = await getCurrentUserId();
  if (!currentUserId) return { success: false, error: "ログインが必要です。" };

  try {
    const audioBytes = await file.arrayBuffer();
    const uploadResult = await uploadAudio(assemblyAiKey, audioBytes);
    if (!uploadResult.ok) return { success: false, error: uploadResult.error };

    const transcriptResult = await requestTranscript(assemblyAiKey, uploadResult.uploadUrl, getTranscriptWebhookConfig());
    if (!transcriptResult.ok) return { success: false, error: transcriptResult.error };

    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("meeting_note_uploads")
      .insert({
        title,
        meeting_at: meetingAt,
        project_id: projectId,
        deal_id: dealId,
        assemblyai_transcript_id: transcriptResult.transcriptId,
        status: "submitted",
        created_by: currentUserId,
      })
      .select("id")
      .single();

    if (error) return { success: false, error: error.message };
    return { success: true, uploadId: data.id };
  } catch (cause) {
    // file.arrayBuffer()やfetch(uploadAudio/requestTranscript)は、ネットワーク瞬断や
    // 大きいファイルでの接続断など、{ok:false}ではなく例外として失敗することがある。
    // ここでcatchしないとServer Action全体が500になり、クライアント側には
    // 「送信に失敗しました。通信環境を...」という原因不明の汎用メッセージしか
    // 届かなくなる(実際に発生した不具合)。実際のエラー内容を返して原因を特定しやすくする。
    const message = cause instanceof Error ? cause.message : String(cause);
    return { success: false, error: `アップロード処理中にエラーが発生しました: ${message}` };
  }
}

export type CheckUploadResult = CompleteUploadResult;

/**
 * アップロード画面がポーリングして完了を確認する(画面を開いたままの場合の即時反映用。
 * 画面を離れた後の完了検知・通知はAssemblyAI Webhook経由で行う、
 * webhooks/assemblyai/route.ts・complete-upload.ts参照)。
 * 実処理はcomplete-upload.tsに共通化しており、Webhookと同じ関数を呼ぶだけ
 * (どちらが先に完了させても安全)。
 */
export async function checkMeetingNoteUploadStatus(uploadId: string): Promise<CheckUploadResult> {
  const authCheck = await requireEditAccess("meeting_notes");
  if (!authCheck.ok) return { status: "failed", error: authCheck.error };

  return completeMeetingNoteUpload(uploadId);
}
