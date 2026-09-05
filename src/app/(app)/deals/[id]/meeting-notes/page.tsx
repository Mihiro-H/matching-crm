import Link from "next/link";
import { notFound } from "next/navigation";
import { getMeetingNotesForDeal } from "@/lib/deals/get-deal-meeting-notes";
import { resolveDealId } from "@/lib/deals/resolve-deal-id";
import { formatDateJa } from "@/lib/format";

export default async function DealMeetingNotesTab({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: numberParam } = await params;
  const dealId = await resolveDealId(numberParam);
  if (!dealId) notFound();

  const { meetingNotes, error } = await getMeetingNotesForDeal(dealId);

  if (error) {
    return <p className="text-sm text-danger-text">議事録の取得に失敗しました: {error}</p>;
  }

  if (meetingNotes.length === 0) {
    return <p className="text-sm text-neutral-600">関連する議事録はまだありません。</p>;
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
