"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export type SearchResultItem = {
  id: string;
  label: string;
  sublabel: string | null;
};

const SEARCH_LIMIT = 20;

/** 社内担当者選択(SCREEN_SPEC.md「共通UIパターン」: 主担当/サブ担当アサイン) */
export async function searchUsers(query: string): Promise<SearchResultItem[]> {
  const supabase = await createSupabaseServerClient();
  let request = supabase.from("users").select("id, name, email").order("name").limit(SEARCH_LIMIT);
  if (query.trim()) {
    request = request.ilike("name", `%${query.trim()}%`);
  }
  const { data, error } = await request;
  if (error) throw new Error(`社内担当者の検索に失敗しました: ${error.message}`);
  return (data ?? []).map((row) => ({ id: row.id, label: row.name, sublabel: row.email }));
}

/** フリーランス選択(SCREEN_SPEC.md「共通UIパターン」: フリーランスアサイン) */
export async function searchFreelancers(query: string): Promise<SearchResultItem[]> {
  const supabase = await createSupabaseServerClient();
  let request = supabase
    .from("freelancers")
    .select("id, name, job_categories")
    .order("name")
    .limit(SEARCH_LIMIT);
  if (query.trim()) {
    request = request.ilike("name", `%${query.trim()}%`);
  }
  const { data, error } = await request;
  if (error) throw new Error(`フリーランスの検索に失敗しました: ${error.message}`);
  return (data ?? []).map((row) => ({
    id: row.id,
    label: row.name,
    sublabel: row.job_categories && row.job_categories.length > 0 ? row.job_categories.join(" / ") : null,
  }));
}

/** 企業選択(SCREEN_SPEC.md「共通UIパターン」: 問い合わせの企業紐付け時) */
export async function searchCompanies(query: string): Promise<SearchResultItem[]> {
  const supabase = await createSupabaseServerClient();
  let request = supabase.from("companies").select("id, name, industry").order("name").limit(SEARCH_LIMIT);
  if (query.trim()) {
    request = request.ilike("name", `%${query.trim()}%`);
  }
  const { data, error } = await request;
  if (error) throw new Error(`企業の検索に失敗しました: ${error.message}`);
  return (data ?? []).map((row) => ({ id: row.id, label: row.name, sublabel: row.industry }));
}

/** 案件選択(SCREEN_SPEC.md 5章「見積・発注」作成画面: 案件を選択すると企業は自動入力) */
export async function searchProjects(query: string): Promise<SearchResultItem[]> {
  const supabase = await createSupabaseServerClient();
  let request = supabase
    .from("projects")
    .select("id, title, company:companies(name)")
    .order("created_at", { ascending: false })
    .limit(SEARCH_LIMIT);
  if (query.trim()) {
    request = request.ilike("title", `%${query.trim()}%`);
  }
  const { data, error } = await request;
  if (error) throw new Error(`案件の検索に失敗しました: ${error.message}`);
  return (data ?? []).map((row) => ({
    id: row.id,
    label: row.title,
    sublabel: row.company?.name ?? null,
  }));
}

/**
 * 企業選択モーダルからのインライン新規登録
 * (SCREEN_SPEC.md「企業選択モーダルの新規作成フロー」)。
 * 新規企業のstatusは「negotiating(商談中)」を初期値とする
 * (DB_SCHEMA.mdに初期値の指定はなく、関係が始まったばかりの状態として妥当と判断)。
 */
export async function createCompany(
  name: string,
  industry: string | null
): Promise<SearchResultItem> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("companies")
    .insert({ name, industry, status: "negotiating" })
    .select("id, name, industry")
    .single();

  if (error) throw new Error(`企業の登録に失敗しました: ${error.message}`);
  return { id: data.id, label: data.name, sublabel: data.industry };
}
