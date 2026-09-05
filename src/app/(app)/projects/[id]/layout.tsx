import { notFound } from "next/navigation";
import { ProjectDetailShell } from "@/components/projects/project-detail-shell";
import { getProjectById } from "@/lib/projects/get-project";
import { getProjectAssignees } from "@/lib/projects/get-project-assignees";
import { getProjectRoles } from "@/lib/projects/get-project-roles";
import { resolveProjectId } from "@/lib/projects/resolve-project-id";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { requirePageAccess } from "@/lib/auth/page-access";
import { SupabaseNotConfiguredNotice } from "@/components/ui/supabase-not-configured-notice";

export default async function ProjectDetailLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  // URLのidは短い連番(projects.number)。内部処理は引き続きuuidを使うため解決する
  // (resolve-project-id.ts参照。URLを短くするための対応)。
  const { id: numberParam } = await params;

  if (!isSupabaseConfigured()) {
    // childrenをそのまま返すと、配下のタブページが未接続のままデータ取得を
    // 試みて例外を投げてしまうため、ここで止めて案内のみ表示する。
    return <SupabaseNotConfiguredNotice />;
  }

  const { canEdit } = await requirePageAccess("projects");

  const id = await resolveProjectId(numberParam);
  if (!id) {
    notFound();
  }

  const project = await getProjectById(id);
  if (!project) {
    notFound();
  }

  const { assignees } = await getProjectAssignees(id);
  const { roles } = await getProjectRoles(id);

  return (
    <ProjectDetailShell project={project} assignees={assignees} roles={roles} canEdit={canEdit}>
      {children}
    </ProjectDetailShell>
  );
}
