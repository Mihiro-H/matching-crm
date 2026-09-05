import Link from "next/link";
import { getProjects } from "@/lib/projects/get-projects";
import { parseProjectsListParams } from "@/lib/projects/list-params";
import { PROJECT_STATUS_ORDER } from "@/lib/projects/status-transitions";
import { PROJECT_STATUS_META } from "@/lib/status-badges";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { requirePageAccess } from "@/lib/auth/page-access";
import { ProjectsTable } from "@/components/projects/projects-table";
import { ProjectsKanban } from "@/components/projects/projects-kanban";
import type { ProjectStatus } from "@/lib/supabase/database.types";

const STATUS_FILTER_CHIPS: { label: string; value: ProjectStatus | null }[] = [
  { label: "すべて", value: null },
  ...PROJECT_STATUS_ORDER.map((status) => ({ label: PROJECT_STATUS_META[status].label, value: status })),
];

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{
    view?: string;
    sort?: string;
    dir?: string;
    status?: string;
    companyName?: string;
    title?: string;
    assigneeId?: string;
    assigneeName?: string;
    page?: string;
  }>;
}) {
  if (!isSupabaseConfigured()) {
    return <SupabaseNotConfiguredNotice />;
  }

  const { canEdit } = await requirePageAccess("projects");

  const resolvedParams = await searchParams;
  const params = parseProjectsListParams(resolvedParams);
  const { projects, totalCount, error } = await getProjects(params);

  const otherView = params.view === "table" ? "kanban" : "table";
  const otherViewHref = `/projects?view=${otherView}`;

  function statusChipHref(status: ProjectStatus | null) {
    const next = new URLSearchParams();
    next.set("view", params.view);
    next.set("sort", params.sortBy);
    next.set("dir", params.sortDir);
    if (status) next.set("status", status);
    if (params.companyNameFilter) next.set("companyName", params.companyNameFilter);
    if (params.titleFilter) next.set("title", params.titleFilter);
    if (params.assigneeFilter) {
      next.set("assigneeId", params.assigneeFilter.id);
      next.set("assigneeName", params.assigneeFilter.name);
    }
    return `/projects?${next.toString()}`;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        {params.view === "table" ? (
          <div className="flex flex-wrap gap-2">
            {STATUS_FILTER_CHIPS.map((chip) => {
              const isActive = params.statusFilter === chip.value;
              return (
                <Link
                  key={chip.label}
                  href={statusChipHref(chip.value)}
                  className={`rounded-full px-3 py-1 text-sm ${
                    isActive
                      ? "bg-primary-500 text-neutral-0"
                      : "border border-neutral-200 text-neutral-600 hover:bg-page-bg"
                  }`}
                >
                  {chip.label}
                </Link>
              );
            })}
          </div>
        ) : (
          <div />
        )}
        <div className="flex items-center gap-2">
          <Link
            href={otherViewHref}
            className="rounded-md border border-neutral-200 bg-neutral-0 px-3 py-1.5 text-sm text-neutral-600 hover:bg-page-bg"
          >
            {params.view === "table" ? "カンバン表示に切り替え" : "テーブル表示に切り替え"}
          </Link>
          {canEdit && (
            <Link href="/projects/new" className="rounded-md bg-primary-500 px-4 py-1.5 text-sm text-neutral-0">
              +新規作成
            </Link>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-danger-bg bg-danger-bg p-4 text-sm text-danger-text">
          案件一覧の取得に失敗しました: {error}
        </div>
      )}

      {!error && params.view === "table" && (
        <ProjectsTable projects={projects} params={params} totalCount={totalCount} />
      )}
      {!error && params.view === "kanban" && <ProjectsKanban projects={projects} canEdit={canEdit} />}
    </div>
  );
}

function SupabaseNotConfiguredNotice() {
  return (
    <div className="rounded-lg border border-neutral-200 bg-neutral-0 p-8">
      <h2 className="text-lg text-neutral-900">Supabase未接続です</h2>
      <p className="mt-2 text-sm text-neutral-600">
        Supabaseの接続情報を .env に設定すると、案件一覧が表示されます。
      </p>
    </div>
  );
}
