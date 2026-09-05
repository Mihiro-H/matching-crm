import { notFound } from "next/navigation";
import { getMeetingNoteById } from "@/lib/meeting-notes/get-meeting-note";
import { ActionItemsChecklist } from "@/components/meeting-notes/action-items-checklist";
import { TranscriptToggle } from "@/components/meeting-notes/transcript-toggle";
import { MeetingNoteSummaryCard } from "@/components/meeting-notes/meeting-note-summary-card";
import { requirePageAccess } from "@/lib/auth/page-access";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { SupabaseNotConfiguredNotice } from "@/components/ui/supabase-not-configured-notice";

export default async function MeetingNoteDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ edit?: string }>;
}) {
  if (!isSupabaseConfigured()) {
    return <SupabaseNotConfiguredNotice />;
  }

  const { id } = await params;
  const { edit } = await searchParams;
  const { canEdit } = await requirePageAccess("meeting_notes");
  const note = await getMeetingNoteById(id);
  if (!note) {
    notFound();
  }

  return (
    <div className="flex flex-col gap-4">
      <MeetingNoteSummaryCard note={note} canEdit={canEdit} startInEditMode={canEdit && edit === "true"} />

      <div className="rounded-lg border border-neutral-200 bg-neutral-0 p-6">
        <h3 className="text-md text-neutral-900">アクションアイテム</h3>
        <div className="mt-3">
          <ActionItemsChecklist
            meetingNoteId={note.id}
            title={note.title}
            initialItems={note.actionItems}
            canEdit={canEdit}
          />
        </div>
      </div>

      {note.transcriptText ? (
        <div className="rounded-lg border border-neutral-200 bg-neutral-0 p-6">
          <TranscriptToggle transcriptText={note.transcriptText} />
        </div>
      ) : (
        note.transcriptUrl && (
          <div className="rounded-lg border border-neutral-200 bg-neutral-0 p-6">
            <a
              href={note.transcriptUrl}
              target="_blank"
              rel="noreferrer"
              className="text-sm text-primary-600 hover:underline"
            >
              文字起こし原文を見る
            </a>
          </div>
        )
      )}
    </div>
  );
}
