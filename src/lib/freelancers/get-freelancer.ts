import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { JobCategory, ProjectStatus } from "@/lib/supabase/database.types";

export type FreelancerDetail = {
  id: string;
  platformFreelancerId: string;
  name: string;
  email: string | null;
  jobCategories: JobCategory[] | null;
};

export async function getFreelancerById(id: string): Promise<FreelancerDetail | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("freelancers")
    .select("id, platform_freelancer_id, name, email, job_categories")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(`フリーランス情報の取得に失敗しました: ${error.message}`);
  }
  if (!data) return null;

  return {
    id: data.id,
    platformFreelancerId: data.platform_freelancer_id,
    name: data.name,
    email: data.email,
    jobCategories: data.job_categories,
  };
}

export type FreelancerAssignment = {
  id: string;
  projectId: string;
  projectNumber: number;
  projectTitle: string;
  companyName: string;
  projectStatus: ProjectStatus;
  jobCategory: JobCategory;
  assignedAt: string;
};

/** フリーランス詳細: アサインされている案件一覧(SCREEN_SPEC.md 9章)。 */
export async function getFreelancerAssignments(
  freelancerId: string
): Promise<{ assignments: FreelancerAssignment[]; error: string | null }> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("project_role_assignments")
    .select(
      "id, assigned_at, project_role:project_roles(job_category, project:projects(id, number, title, status, company:companies(name)))"
    )
    .eq("freelancer_id", freelancerId)
    .order("assigned_at", { ascending: false });

  if (error) {
    return { assignments: [], error: error.message };
  }

  const assignments = (data ?? []).flatMap((row) => {
    const project = row.project_role?.project;
    if (!row.project_role || !project) return [];
    return [
      {
        id: row.id,
        projectId: project.id,
        projectNumber: project.number,
        projectTitle: project.title,
        companyName: project.company?.name ?? "(企業不明)",
        projectStatus: project.status,
        jobCategory: row.project_role.job_category,
        assignedAt: row.assigned_at,
      },
    ];
  });

  return { assignments, error: null };
}
