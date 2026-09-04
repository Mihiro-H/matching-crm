import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ContactStatus, JobCategory } from "@/lib/supabase/database.types";
import type { ContactsListParams } from "./list-params";

export type ContactListRow = {
  id: string;
  companyName: string;
  name: string;
  source: string;
  createdAt: string;
  status: ContactStatus;
  jobCategories: JobCategory[];
  assigneeName: string | null;
};

const SORT_COLUMN_MAP: Record<ContactsListParams["sortBy"], string> = {
  company: "company_name",
  name: "name",
  status: "status",
  source: "source",
  assignee: "assignee_name",
  createdAt: "created_at",
};

/**
 * 商談・担当者管理一覧(SCREEN_SPEC.md 2章)のテーブル表示用データ。
 * 企業名・主担当名の結合は contact_list_view (migration参照) で解決する。
 * 列見出しクリックの絞り込み(企業名/担当者名テキスト検索、主担当モーダル選択)にも対応する。
 */
export async function getContacts(
  params: ContactsListParams
): Promise<{ contacts: ContactListRow[]; error: string | null }> {
  const supabase = await createSupabaseServerClient();

  let query = supabase
    .from("contact_list_view")
    .select("id, company_name, name, source, created_at, status, job_categories, assignee_name")
    .order(SORT_COLUMN_MAP[params.sortBy], { ascending: params.sortDir === "asc" });

  if (params.statusFilter) {
    query = query.eq("status", params.statusFilter);
  }
  if (params.companyNameFilter) {
    query = query.ilike("company_name", `%${params.companyNameFilter}%`);
  }
  if (params.nameFilter) {
    query = query.ilike("name", `%${params.nameFilter}%`);
  }
  if (params.assigneeFilter) {
    query = query.eq("assigned_user_id", params.assigneeFilter.id);
  }

  const { data, error } = await query;

  if (error) {
    return { contacts: [], error: error.message };
  }

  return {
    contacts: (data ?? []).map((row) => ({
      id: row.id,
      companyName: row.company_name ?? "(企業名未登録)",
      name: row.name,
      source: row.source,
      createdAt: row.created_at,
      status: row.status,
      jobCategories: row.job_categories,
      assigneeName: row.assignee_name,
    })),
    error: null,
  };
}
