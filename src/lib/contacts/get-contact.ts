import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";

export type ContactDetail = Database["public"]["Tables"]["contacts"]["Row"] & {
  companyName: string | null;
  assigneeName: string | null;
};

export async function getContactById(id: string): Promise<ContactDetail | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("contacts")
    .select("*, company:companies(name), assignee:users(name)")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(`商談情報の取得に失敗しました: ${error.message}`);
  }
  if (!data) return null;

  const { company, assignee, ...contact } = data;
  return {
    ...contact,
    companyName: company?.name ?? null,
    assigneeName: assignee?.name ?? null,
  };
}
