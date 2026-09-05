import { createSupabaseServerClient } from "@/lib/supabase/server";
import { rangeForPage } from "@/lib/pagination";

export type PersonListRow = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  companyName: string | null;
};

/**
 * 担当者一覧(SCREEN_SPEC.md「担当者一覧」)。
 * 既存顧客・見込み顧客を問わず、companiesに紐づく(または紐づいていない)
 * 担当者を横断的にフラット表示する。基本情報(担当者名・メール・電話番号・企業名)のみ。
 */
export async function getPeople(
  page: number
): Promise<{ people: PersonListRow[]; totalCount: number; error: string | null }> {
  const supabase = await createSupabaseServerClient();
  const { data, error, count } = await supabase
    .from("people")
    .select("id, name, email, phone, company_name_raw, company:companies(name)", { count: "exact" })
    .order("name")
    .range(...rangeForPage(page));

  if (error) return { people: [], totalCount: 0, error: error.message };

  return {
    people: (data ?? []).map((row) => ({
      id: row.id,
      name: row.name,
      email: row.email,
      phone: row.phone,
      companyName: row.company?.name ?? row.company_name_raw,
    })),
    totalCount: count ?? 0,
    error: null,
  };
}
