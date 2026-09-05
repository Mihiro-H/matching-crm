import { getMeetingNotes, getProjectFilterOptions } from "@/lib/meeting-notes/get-meeting-notes";
import { MeetingNotesTabs } from "@/components/meeting-notes/meeting-notes-tabs";
import { MeetingNotesTable } from "@/components/meeting-notes/meeting-notes-table";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { requirePageAccess } from "@/lib/auth/page-access";
import { parsePageParam } from "@/lib/pagination";

export default async function MeetingNotesPage({
  searchParams,
}: {
  searchParams: Promise<{
    companyName?: string;
    projectId?: string;
    dateFrom?: string;
    dateTo?: string;
    page?: string;
  }>;
}) {
  if (!isSupabaseConfigured()) {
    return <SupabaseNotConfiguredNotice />;
  }

  const { canEdit } = await requirePageAccess("meeting_notes");

  const params = await searchParams;
  const page = parsePageParam(params.page);
  const filter = {
    companyNameQuery: params.companyName ?? "",
    projectId: params.projectId || null,
    dateFrom: params.dateFrom || null,
    dateTo: params.dateTo || null,
    page,
  };

  const [{ notes, totalCount, error }, projectOptions] = await Promise.all([
    getMeetingNotes(filter),
    getProjectFilterOptions(),
  ]);

  // ページネーションのリンク生成用に、現在の絞り込み条件をそのまま維持しつつ
  // pageだけ差し替える(MeetingNotesTableはクライアントコンポーネントのため、
  // 関数ではなく素のクエリ文字列を渡す)。
  const currentQuery: Record<string, string> = {};
  if (filter.companyNameQuery) currentQuery.companyName = filter.companyNameQuery;
  if (filter.projectId) currentQuery.projectId = filter.projectId;
  if (filter.dateFrom) currentQuery.dateFrom = filter.dateFrom;
  if (filter.dateTo) currentQuery.dateTo = filter.dateTo;

  return (
    <div className="flex flex-col gap-4">
      <MeetingNotesTabs />

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

      {!error && (
        <MeetingNotesTable
          notes={notes}
          canEdit={canEdit}
          page={page}
          totalCount={totalCount}
          currentQuery={currentQuery}
        />
      )}
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
