import { redirect } from "next/navigation";
import { ProjectCreateForm } from "@/components/projects/project-create-form";
import { requirePageAccess } from "@/lib/auth/page-access";

export default async function NewProjectPage() {
  const { canEdit } = await requirePageAccess("projects");
  if (!canEdit) {
    redirect("/projects");
  }

  return <ProjectCreateForm />;
}
