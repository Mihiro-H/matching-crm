import Link from "next/link";
import { getProjects } from "@/lib/projects/get-projects";
import { parseProjectsListParams } from "@/lib/projects/list-params";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { ProjectsTable } from "@/components/projects/projects-table";
import { ProjectsKanban } from "@/components/projects/projects-kanban";

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; sort?: string; dir?: string; status?: string }>;
}) {
  if (!isSupabaseConfigured()) {
    return <SupabaseNotConfiguredNotice />;
  }

  const resolvedParams = await searchParams;
  const params = parseProjectsListParams(resolvedParams);
  const { projects, error } = await getProjects(params);

  const otherView = params.view === "table" ? "kanban" : "table";
  const otherViewHref = `/projects?view=${otherView}`;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Link
          href={otherViewHref}
          className="rounded-md border border-neutral-200 bg-neutral-0 px-3 py-1.5 text-sm text-neutral-600 hover:bg-page-bg"
        >
          {params.view === "table" ? "カンバン表示に切り替え" : "テーブル表示に切り替え"}
        </Link>
      </div>

      {error && (
        <div className="rounded-lg border border-danger-bg bg-danger-bg p-4 text-sm text-danger-text">
          案件一覧の取得に失敗しました: {error}
        </div>
      )}

      {!error && params.view === "table" && <ProjectsTable projects={projects} params={params} />}
      {!error && params.view === "kanban" && <ProjectsKanban projects={projects} />}
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
