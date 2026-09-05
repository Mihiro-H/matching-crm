import { createSupabaseServerClient } from "@/lib/supabase/server";

export type CompanyPersonRow = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
};

/** 企業詳細「担当者」タブ(SCREEN_SPEC.md「担当者一覧」)。その企業に紐づく担当者をフラットに一覧表示する。 */
export async function getCompanyPeople(
  companyId: string
): Promise<{ people: CompanyPersonRow[]; error: string | null }> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("people")
    .select("id, name, email, phone")
    .eq("company_id", companyId)
    .order("name");

  if (error) {
    return { people: [], error: error.message };
  }
  return { people: data ?? [], error: null };
}
