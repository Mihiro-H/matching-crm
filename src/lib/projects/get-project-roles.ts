import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { JobCategory } from "@/lib/supabase/database.types";

export type ProjectRoleAssignment = { id: string; freelancerId: string; freelancerName: string };
export type ProjectRole = {
  id: string;
  jobCategory: JobCategory;
  headcount: number;
  assignments: ProjectRoleAssignment[];
};

/** 案件詳細「職種枠セクション」(SCREEN_SPEC.md 4章) */
export async function getProjectRoles(
  projectId: string
): Promise<{ roles: ProjectRole[]; error: string | null }> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("project_roles")
    .select(
      "id, job_category, headcount, project_role_assignments(id, freelancer:freelancers(id, name))"
    )
    .eq("project_id", projectId)
    .order("created_at", { ascending: true });

  if (error) {
    return { roles: [], error: error.message };
  }

  return {
    roles: (data ?? []).map((row) => ({
      id: row.id,
      jobCategory: row.job_category,
      headcount: row.headcount,
      assignments: (row.project_role_assignments ?? [])
        .filter((a) => a.freelancer !== null)
        .map((a) => ({
          id: a.id,
          freelancerId: a.freelancer!.id,
          freelancerName: a.freelancer!.name,
        })),
    })),
    error: null,
  };
}
