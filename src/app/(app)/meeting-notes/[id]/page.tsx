import { notFound } from "next/navigation";
import { getMeetingNoteById } from "@/lib/meeting-notes/get-meeting-note";
import { formatDateJa } from "@/lib/format";
import { ActionItemsChecklist } from "@/components/meeting-notes/action-items-checklist";
import { requirePageAccess } from "@/lib/auth/page-access";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { SupabaseNotConfiguredNotice } from "@/components/ui/supabase-not-configured-notice";

export default async function MeetingNoteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!isSupabaseConfigured()) {
    return <SupabaseNotConfiguredNotice />;
  }

  const { id } = await params;
  const { canEdit } = await requirePageAccess("meeting_notes");
  const note = await getMeetingNoteById(id);
  if (!note) {
    notFound();
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-lg border border-neutral-200 bg-neutral-0 p-6">
        <div className="flex items-start justify-between">
          <h2 className="text-lg text-neutral-900">{note.title}</h2>
          <span className="rounded-sm bg-accent-50 px-2 py-0.5 text-xs text-accent-600">AI自動生成</span>
        </div>
        <p className="mt-1 text-xs text-neutral-600">{formatDateJa(note.meetingAt)}</p>

        <div className="mt-4">
          <p className="text-xs text-neutral-600">AI要約</p>
          <p className="mt-1 whitespace-pre-wrap text-sm text-neutral-900">{note.aiSummary}</p>
        </div>

        {note.transcriptUrl && (
          <a
            href={note.transcriptUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-4 inline-block text-sm text-primary-600 hover:underline"
          >
            文字起こし原文を見る
          </a>
        )}
      </div>

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
    </div>
  );
}
