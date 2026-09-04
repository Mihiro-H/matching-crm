import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { verifySharedSecret } from "@/lib/webhooks/verify-signature";
import { getGoogleDriveAccessToken } from "@/lib/google/service-account-token";
import { downloadFile, listAudioFiles, listSubfolders } from "@/lib/google/drive-client";
import { getTranscript, requestTranscript, uploadAudio } from "@/lib/assemblyai/client";
import { matchCompanyByFolderName } from "@/lib/meeting-notes/match-company";

type SupabaseAdminClient = ReturnType<typeof createSupabaseAdminClient>;

/**
 * 議事録自動取り込み(Google Drive + AssemblyAI, SCREEN_SPEC.md 6章)。
 * Vercel Cronから定期的に呼ばれる想定(vercel.jsonでスケジュール設定が必要)。
 * 認証はrun-reportsと同じVercel Cron標準方式。
 *
 * AssemblyAIの文字起こしは非同期(数十秒〜数分)で、1回のリクエストで待ちきると
 * サーバーレス関数のタイムアウトに引っかかりうるため2フェーズに分ける:
 *   フェーズ1: Driveの新規音声ファイルを見つけてAssemblyAIに投げ、
 *              drive_meeting_imports に status=submitted で記録するだけ
 *   フェーズ2: 前回までにsubmittedになっている行を確認し、完了していれば
 *              meeting_notesを作成してstatus=completedにする
 * (完了していなければ何もせず、次回のcron実行で再確認する)
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  const provided = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!secret || !verifySharedSecret(secret, provided)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const rootFolderId = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID;
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;
  const assemblyAiKey = process.env.ASSEMBLYAI_API_KEY;
  // meeting_notes.created_by は NOT NULL の users.id 外部キー。
  // 運用上「システム用ユーザー」のpublic.users行を1つ作成し、そのidを設定しておくこと。
  const systemUserId = process.env.SYSTEM_USER_ID;

  if (!rootFolderId || !clientEmail || !privateKey || !assemblyAiKey || !systemUserId) {
    return NextResponse.json(
      { error: "議事録自動取り込みの環境変数が未設定です(GOOGLE_*/ASSEMBLYAI_API_KEY/SYSTEM_USER_ID)" },
      { status: 500 }
    );
  }

  const admin = createSupabaseAdminClient();

  const tokenResult = await getGoogleDriveAccessToken({ clientEmail, privateKey });
  if (!tokenResult.ok) {
    return NextResponse.json({ error: tokenResult.error }, { status: 502 });
  }

  const submitted = await submitNewRecordings(admin, tokenResult.accessToken, rootFolderId, assemblyAiKey);
  const completed = await completePendingImports(admin, assemblyAiKey, systemUserId);

  return NextResponse.json({ submitted, completed });
}

async function submitNewRecordings(
  admin: SupabaseAdminClient,
  accessToken: string,
  rootFolderId: string,
  assemblyAiKey: string
): Promise<number> {
  const { data: companies } = await admin.from("companies").select("id, name");
  const folders = await listSubfolders(accessToken, rootFolderId);

  let submittedCount = 0;
  for (const folder of folders) {
    const matchedCompanyId = matchCompanyByFolderName(folder.name, companies ?? []);
    const files = await listAudioFiles(accessToken, folder.id);

    for (const file of files) {
      const { data: existing } = await admin
        .from("drive_meeting_imports")
        .select("id")
        .eq("drive_file_id", file.id)
        .maybeSingle();
      if (existing) continue; // 処理済み、または処理中(dedup)

      const baseRow = {
        drive_file_id: file.id,
        drive_file_name: file.name,
        drive_file_web_view_link: file.webViewLink,
        matched_company_id: matchedCompanyId,
      };

      try {
        const audioBytes = await downloadFile(accessToken, file.id);
        const uploadResult = await uploadAudio(assemblyAiKey, audioBytes);
        if (!uploadResult.ok) {
          await admin
            .from("drive_meeting_imports")
            .insert({ ...baseRow, status: "failed", error_message: uploadResult.error });
          continue;
        }

        const transcriptResult = await requestTranscript(assemblyAiKey, uploadResult.uploadUrl);
        if (!transcriptResult.ok) {
          await admin
            .from("drive_meeting_imports")
            .insert({ ...baseRow, status: "failed", error_message: transcriptResult.error });
          continue;
        }

        await admin.from("drive_meeting_imports").insert({
          ...baseRow,
          assemblyai_transcript_id: transcriptResult.transcriptId,
          status: "submitted",
        });
        submittedCount++;
      } catch (e) {
        await admin.from("drive_meeting_imports").insert({
          ...baseRow,
          status: "failed",
          error_message: e instanceof Error ? e.message : "不明なエラー",
        });
      }
    }
  }
  return submittedCount;
}

async function completePendingImports(
  admin: SupabaseAdminClient,
  assemblyAiKey: string,
  systemUserId: string
): Promise<number> {
  const { data: pending } = await admin
    .from("drive_meeting_imports")
    .select("id, drive_file_name, drive_file_web_view_link, matched_company_id, assemblyai_transcript_id")
    .eq("status", "submitted");

  let completedCount = 0;
  for (const item of pending ?? []) {
    if (!item.assemblyai_transcript_id) continue;

    const result = await getTranscript(assemblyAiKey, item.assemblyai_transcript_id);
    if (!result.ok) {
      await admin
        .from("drive_meeting_imports")
        .update({ status: "failed", error_message: result.error })
        .eq("id", item.id);
      continue;
    }
    if (result.status !== "completed") continue; // まだ処理中。次回のcronで再確認する

    const { data: note, error } = await admin
      .from("meeting_notes")
      .insert({
        title: item.drive_file_name,
        meeting_at: new Date().toISOString(),
        source: "upload",
        company_id: item.matched_company_id,
        transcript_url: item.drive_file_web_view_link,
        ai_summary: result.summary ?? result.text,
        action_items: [],
        created_by: systemUserId,
      })
      .select("id")
      .single();

    if (error) {
      await admin
        .from("drive_meeting_imports")
        .update({ status: "failed", error_message: error.message })
        .eq("id", item.id);
      continue;
    }

    await admin
      .from("drive_meeting_imports")
      .update({ status: "completed", meeting_note_id: note.id })
      .eq("id", item.id);
    completedCount++;
  }
  return completedCount;
}
