import Link from "next/link";
import { notFound } from "next/navigation";
import { getProjectMeetingNotes } from "@/lib/projects/get-project-meeting-notes";
import { resolveProjectId } from "@/lib/projects/resolve-project-id";
import { formatDateJa } from "@/lib/format";

export default async function ProjectMeetingNotesTab({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: numberParam } = await params;
  const id = await resolveProjectId(numberParam);
  if (!id) notFound();

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
            <Link href={`/meeting-notes/${note.id}?edit=true`} className="text-md text-primary-600 hover:underline">
              {note.title}
            </Link>
            <span className="text-xs text-neutral-600">{formatDateJa(note.meeting_at)}</span>
          </div>
          <p className="mt-2 line-clamp-2 text-sm text-neutral-600">{note.ai_summary}</p>
        </li>
      ))}
    </ul>
  );
}
