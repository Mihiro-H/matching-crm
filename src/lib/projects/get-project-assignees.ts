import { createSupabaseServerClient } from "@/lib/supabase/server";

export type ProjectAssignee = {
  id: string;
  userId: string;
  name: string;
  role: "primary" | "secondary";
};

export async function getProjectAssignees(
  projectId: string
): Promise<{ assignees: ProjectAssignee[]; error: string | null }> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("project_assignees")
    .select("id, role, user:users(id, name)")
    .eq("project_id", projectId)
    .order("role");

  if (error) {
    return { assignees: [], error: error.message };
  }

  return {
    assignees: (data ?? [])
      .filter((row) => row.user !== null)
      .map((row) => ({
        id: row.id,
        userId: row.user!.id,
        name: row.user!.name,
        role: row.role,
      })),
    error: null,
  };
}
