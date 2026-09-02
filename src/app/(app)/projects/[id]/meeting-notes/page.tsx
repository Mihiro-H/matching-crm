import { getProjectMeetingNotes } from "@/lib/projects/get-project-meeting-notes";
import { formatDateJa } from "@/lib/format";

export default async function ProjectMeetingNotesTab({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { meetingNotes, error } = await getProjectMeetingNotes(id);

  if (error) {
    return <p className="text-sm text-danger-text">議事録の取得に失敗しました: {error}</p>;
  }

  if (meetingNotes.length === 0) {
    return <p className="text-sm text-neutral-600">この案件の議事録はまだありません。</p>;
  }

  return (
    <ul className="flex flex-col gap-2">
      {meetingNotes.map((note) => (
        <li key={note.id} className="rounded-lg border border-neutral-200 bg-neutral-0 p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-md text-neutral-900">{note.title}</h3>
            <span className="text-xs text-neutral-600">{formatDateJa(note.meeting_at)}</span>
          </div>
          <p className="mt-2 line-clamp-2 text-sm text-neutral-600">{note.ai_summary}</p>
        </li>
      ))}
    </ul>
  );
}
