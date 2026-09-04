import Link from "next/link";
import { getMeetingNotes, getProjectFilterOptions } from "@/lib/meeting-notes/get-meeting-notes";
import { formatDateJa } from "@/lib/format";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { requirePageAccess } from "@/lib/auth/page-access";

export default async function MeetingNotesPage({
  searchParams,
}: {
  searchParams: Promise<{ companyName?: string; projectId?: string; dateFrom?: string; dateTo?: string }>;
}) {
  if (!isSupabaseConfigured()) {
    return <SupabaseNotConfiguredNotice />;
  }

  await requirePageAccess("meeting_notes");

  const params = await searchParams;
  const filter = {
    companyNameQuery: params.companyName ?? "",
    projectId: params.projectId || null,
    dateFrom: params.dateFrom || null,
    dateTo: params.dateTo || null,
  };

  const [{ notes, error }, projectOptions] = await Promise.all([
    getMeetingNotes(filter),
    getProjectFilterOptions(),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <form className="flex flex-wrap items-end gap-3 rounded-lg border border-neutral-200 bg-neutral-0 p-4">
        <label className="flex flex-col gap-1">
          <span className="text-xs text-neutral-600">企業名</span>
          <input
            type="text"
            name="companyName"
            defaultValue={filter.companyNameQuery}
            className="rounded-md border border-neutral-200 bg-neutral-0 px-3 py-2 text-sm text-neutral-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-neutral-600">案件名</span>
          <select
            name="projectId"
            defaultValue={filter.projectId ?? ""}
            className="rounded-md border border-neutral-200 bg-neutral-0 px-3 py-2 text-sm text-neutral-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
          >
            <option value="">すべて</option>
            {projectOptions.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-neutral-600">作成日(from)</span>
          <input
            type="date"
            name="dateFrom"
            defaultValue={filter.dateFrom ?? ""}
            className="rounded-md border border-neutral-200 bg-neutral-0 px-3 py-2 text-sm text-neutral-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-neutral-600">作成日(to)</span>
          <input
            type="date"
            name="dateTo"
            defaultValue={filter.dateTo ?? ""}
            className="rounded-md border border-neutral-200 bg-neutral-0 px-3 py-2 text-sm text-neutral-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
          />
        </label>
        <button type="submit" className="rounded-md bg-primary-500 px-4 py-2 text-sm text-neutral-0">
          絞り込む
        </button>
      </form>

      {error && (
        <div className="rounded-lg border border-danger-bg bg-danger-bg p-4 text-sm text-danger-text">
          一覧の取得に失敗しました: {error}
        </div>
      )}

      <div className="grid grid-cols-3 gap-4">
        {notes.map((note) => (
          <Link
            key={note.id}
            href={`/meeting-notes/${note.id}`}
            className="rounded-lg border border-neutral-200 bg-neutral-0 p-4 hover:border-primary-500"
          >
            <div className="flex items-start justify-between gap-2">
              <h3 className="text-md text-neutral-900">{note.title}</h3>
              <span className="shrink-0 rounded-sm bg-accent-50 px-2 py-0.5 text-xs text-accent-600">
                AI自動生成
              </span>
            </div>
            <p className="mt-1 text-xs text-neutral-600">
              {note.companyName} ・ {formatDateJa(note.meetingAt)}
            </p>
            <p className="mt-2 text-sm text-neutral-600">{note.aiSummaryExcerpt}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {note.projectId === null && (
                <span className="inline-block rounded-sm bg-warning-bg px-2 py-0.5 text-xs text-warning-text">
                  案件未紐付け
                </span>
              )}
              {note.pendingActionItemCount > 0 && (
                <span className="inline-block rounded-sm bg-warning-bg px-2 py-0.5 text-xs text-warning-text">
                  要タスク化 {note.pendingActionItemCount}件
                </span>
              )}
            </div>
          </Link>
        ))}

        {notes.length === 0 && !error && (
          <p className="col-span-3 py-8 text-center text-sm text-neutral-600">
            該当する議事録はありません。
          </p>
        )}
      </div>
    </div>
  );
}

function SupabaseNotConfiguredNotice() {
  return (
    <div className="rounded-lg border border-neutral-200 bg-neutral-0 p-8">
      <h2 className="text-lg text-neutral-900">Supabase未接続です</h2>
      <p className="mt-2 text-sm text-neutral-600">
        Supabaseの接続情報を .env に設定すると、一覧が表示されます。
      </p>
    </div>
  );
}
