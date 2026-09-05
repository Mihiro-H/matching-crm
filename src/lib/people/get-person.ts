import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { DealStatus } from "@/lib/supabase/database.types";

export type PersonDetail = {
  id: string;
  companyId: string | null;
  companyName: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  createdAt: string;
};

export async function getPersonById(id: string): Promise<PersonDetail | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("people")
    .select("id, company_id, company_name_raw, name, email, phone, created_at, company:companies(name)")
    .eq("id", id)
    .maybeSingle();

  if (error || !data) return null;

  return {
    id: data.id,
    companyId: data.company_id,
    companyName: data.company?.name ?? data.company_name_raw,
    name: data.name,
    email: data.email,
    phone: data.phone,
    createdAt: data.created_at,
  };
}

export type PersonDealRow = {
  id: string;
  status: DealStatus;
  createdAt: string;
};

/** 担当者詳細「商談一覧」タブ(SCREEN_SPEC.md「担当者一覧」)。 */
export async function getDealsForPerson(personId: string): Promise<{ deals: PersonDealRow[]; error: string | null }> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("deals")
    .select("id, status, created_at")
    .eq("person_id", personId)
    .order("created_at", { ascending: false });

  if (error) return { deals: [], error: error.message };

  return {
    deals: (data ?? []).map((row) => ({ id: row.id, status: row.status, createdAt: row.created_at })),
    error: null,
  };
}
