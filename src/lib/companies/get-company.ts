import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";

export type Company = Database["public"]["Tables"]["companies"]["Row"];

export async function getCompanyById(id: string): Promise<Company | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("companies").select("*").eq("id", id).maybeSingle();

  if (error) {
    throw new Error(`企業情報の取得に失敗しました: ${error.message}`);
  }

  return data;
}
