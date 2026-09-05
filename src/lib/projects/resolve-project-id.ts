import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * URLに使う短い連番(projects.number)から内部的なuuid(projects.id)を解決する
 * (deals/resolve-deal-id.tsと同じ理由・同じ方針)。
 */
export async function resolveProjectId(numberParam: string): Promise<string | null> {
  const number = Number(numberParam);
  if (!Number.isInteger(number)) return null;

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from("projects").select("id").eq("number", number).maybeSingle();
  return data?.id ?? null;
}
