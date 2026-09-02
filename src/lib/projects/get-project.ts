import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";

export type ProjectDetail = Database["public"]["Tables"]["projects"]["Row"] & {
  companyName: string;
};

export async function getProjectById(id: string): Promise<ProjectDetail | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("projects")
    .select("*, company:companies(name)")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(`案件情報の取得に失敗しました: ${error.message}`);
  }
  if (!data) return null;

  const { company, ...project } = data;
  return { ...project, companyName: company?.name ?? "(企業不明)" };
}
