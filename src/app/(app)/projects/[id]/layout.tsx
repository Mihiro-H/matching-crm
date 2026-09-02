import { notFound } from "next/navigation";
import { ProjectDetailShell } from "@/components/projects/project-detail-shell";
import { getProjectById } from "@/lib/projects/get-project";
import { getProjectAssignees } from "@/lib/projects/get-project-assignees";
import { getProjectRoles } from "@/lib/projects/get-project-roles";
import { isSupabaseConfigured } from "@/lib/supabase/server";

export default async function ProjectDetailLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  if (!isSupabaseConfigured()) {
    return children;
  }

  const project = await getProjectById(id);
  if (!project) {
    notFound();
  }

  const { assignees } = await getProjectAssignees(id);
  const { roles } = await getProjectRoles(id);

  return (
    <ProjectDetailShell project={project} assignees={assignees} roles={roles}>
      {children}
    </ProjectDetailShell>
  );
}
