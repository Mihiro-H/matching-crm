import { redirect } from "next/navigation";
import { MeetingNotesTabs } from "@/components/meeting-notes/meeting-notes-tabs";
import { MeetingNoteUploadForm } from "@/components/meeting-notes/meeting-note-upload-form";
import { requirePageAccess } from "@/lib/auth/page-access";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { SupabaseNotConfiguredNotice } from "@/components/ui/supabase-not-configured-notice";

// 音声/動画ファイルのAssemblyAIへのアップロード自体に時間がかかることがあるため、
// このルートで呼ばれるServer Action(submitMeetingRecordingUpload)の実行時間上限を
// プラン上の最大値まで伸ばす(Vercel Hobbyプランは60秒が上限。それでも大きい
// ファイルでは足りない場合がある点に注意)。
export const maxDuration = 60;

export default async function MeetingNotesUploadPage() {
  if (!isSupabaseConfigured()) {
    return <SupabaseNotConfiguredNotice />;
  }

  const { canEdit } = await requirePageAccess("meeting_notes");
  if (!canEdit) {
    redirect("/meeting-notes");
  }

  return (
    <div className="flex flex-col gap-4">
      <MeetingNotesTabs />
      <MeetingNoteUploadForm />
    </div>
  );
}
