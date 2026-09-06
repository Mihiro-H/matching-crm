import { createSupabaseServerClient } from "@/lib/supabase/server";

export type FormListRow = { id: string; number: number; name: string; fieldCount: number; updatedAt: string };

/** フォーム管理 一覧。 */
export async function getForms(): Promise<{ forms: FormListRow[]; error: string | null }> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("form_definitions")
    .select("id, number, name, updated_at, form_fields(id)")
    .order("created_at", { ascending: false });

  if (error) return { forms: [], error: error.message };

  return {
    forms: (data ?? []).map((row) => ({
      id: row.id,
      number: row.number,
      name: row.name,
      fieldCount: row.form_fields?.length ?? 0,
      updatedAt: row.updated_at,
    })),
    error: null,
  };
}
