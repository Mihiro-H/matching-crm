import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ContactStatus, JobCategory } from "@/lib/supabase/database.types";

export type ContactCard = {
  id: string;
  companyName: string;
  source: string;
  createdAt: string;
  status: ContactStatus;
  jobCategories: JobCategory[];
  assigneeName: string | null;
};

/**
 * 商談・担当者管理一覧(SCREEN_SPEC.md 2章)のカード一覧データ。
 * 企業名は company_name_raw(企業確定前) または companies.name(確定後)。
 */
export async function getContacts(
  statusFilter: ContactStatus | null
): Promise<{ contacts: ContactCard[]; error: string | null }> {
  const supabase = await createSupabaseServerClient();

  let query = supabase
    .from("contacts")
    .select("id, company_name_raw, source, created_at, status, job_categories, company:companies(name), assignee:users(name)")
    .order("created_at", { ascending: false });

  if (statusFilter) {
    query = query.eq("status", statusFilter);
  }

  const { data, error } = await query;

  if (error) {
    return { contacts: [], error: error.message };
  }

  return {
    contacts: (data ?? []).map((row) => ({
      id: row.id,
      companyName: row.company?.name ?? row.company_name_raw ?? "(企業名未登録)",
      source: row.source,
      createdAt: row.created_at,
      status: row.status,
      jobCategories: row.job_categories,
      assigneeName: row.assignee?.name ?? null,
    })),
    error: null,
  };
}
