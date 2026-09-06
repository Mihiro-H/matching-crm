"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ProjectStatus } from "@/lib/supabase/database.types";

export type SearchResultItem = {
  id: string;
  label: string;
  sublabel: string | null;
};

const SEARCH_LIMIT = 20;

/**
 * 社内ユーザー選択(一覧の「担当者で絞り込み」列見出し、権限設定の対象ユーザー選択など)。
 * アーカイブ済みユーザーも含む全ユーザーが対象(過去にアサインされていたユーザーで
 * 絞り込めなくなると困るため)。実際に新規で担当者にアサインする用途には
 * 使わないこと(searchAssignableUsers参照)。
 */
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

/**
 * 担当者アサイン用の社内ユーザー選択(SCREEN_SPEC.md「共通UIパターン」: 主担当/サブ担当アサイン)。
 * アーカイブ済みユーザーは退職等で担当を外れた扱いのため、新規アサインの候補には出さない
 * (過去のアサイン履歴自体は削除されず残る)。
 */
export async function searchAssignableUsers(query: string): Promise<SearchResultItem[]> {
  const supabase = await createSupabaseServerClient();
  let request = supabase
    .from("users")
    .select("id, name, email")
    .eq("is_archived", false)
    .order("name")
    .limit(SEARCH_LIMIT);
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

/** 商談選択(SCREEN_SPEC.md 6章「議事録アップロード」: 関連する商談を選ぶ) */
export async function searchDeals(query: string): Promise<SearchResultItem[]> {
  const supabase = await createSupabaseServerClient();
  let request = supabase
    .from("deals_list_view")
    .select("id, name, company_name")
    .order("created_at", { ascending: false })
    .limit(SEARCH_LIMIT);
  if (query.trim()) {
    request = request.ilike("name", `%${query.trim()}%`);
  }
  const { data, error } = await request;
  if (error) throw new Error(`商談の検索に失敗しました: ${error.message}`);
  return (data ?? []).map((row) => ({
    id: row.id,
    label: row.name,
    sublabel: row.company_name,
  }));
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
 * ステータスで絞り込んだ案件選択(見積書・納品書・請求書作成画面: SCREEN_SPEC.md 5,7章)。
 * 書類の性質上まだ選べるはずのない進行段階の案件(例: 見積書作成画面に契約済案件)を
 * 誤って選ばないよう、画面ごとに許可されたステータスのみへ絞り込む。
 */
export async function searchProjectsByStatus(
  query: string,
  statuses: ProjectStatus[]
): Promise<SearchResultItem[]> {
  const supabase = await createSupabaseServerClient();
  let request = supabase
    .from("projects")
    .select("id, title, company:companies(name)")
    .in("status", statuses)
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
 * 企業を絞り込んだ案件選択(議事録の「案件を紐づける」: Drive取り込みで企業までは
 * 自動特定済みのため、無関係な企業の案件を誤って選ばないよう絞り込む)。
 */
export async function searchProjectsByCompany(
  companyId: string,
  query: string
): Promise<SearchResultItem[]> {
  const supabase = await createSupabaseServerClient();
  let request = supabase
    .from("projects")
    .select("id, title")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false })
    .limit(SEARCH_LIMIT);
  if (query.trim()) {
    request = request.ilike("title", `%${query.trim()}%`);
  }
  const { data, error } = await request;
  if (error) throw new Error(`案件の検索に失敗しました: ${error.message}`);
  return (data ?? []).map((row) => ({ id: row.id, label: row.title, sublabel: null }));
}

/**
 * 企業選択モーダルからのインライン新規登録
 * (SCREEN_SPEC.md「企業選択モーダルの新規作成フロー」)。
 */
export async function createCompany(
  name: string,
  industry: string | null
): Promise<SearchResultItem> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("companies")
    .insert({ name, industry })
    .select("id, name, industry")
    .single();

  if (error) throw new Error(`企業の登録に失敗しました: ${error.message}`);
  return { id: data.id, label: data.name, sublabel: data.industry };
}

/**
 * 担当者選択(SCREEN_SPEC.md「商談管理」作成画面: 商談に紐づける担当者を選ぶ。
 * 統合先候補の検索(person-merge-section.tsx)にも使う)。
 * メールアドレス重複の統合では「同じメールアドレスの相手を探す」のが主目的のため、
 * 氏名だけでなくメールアドレスでも検索できるようにする。
 */
type PersonSearchRow = {
  id: string;
  name: string;
  email: string | null;
  company_name_raw: string | null;
  company: { name: string } | null;
};

function toPersonSearchResult(row: PersonSearchRow): SearchResultItem {
  const companyLabel = row.company?.name ?? row.company_name_raw;
  return { id: row.id, label: row.name, sublabel: [companyLabel, row.email].filter(Boolean).join(" / ") || null };
}

export async function searchPeople(query: string): Promise<SearchResultItem[]> {
  const supabase = await createSupabaseServerClient();
  const select = "id, name, email, company_name_raw, company:companies(name)";
  const trimmed = query.trim();

  if (!trimmed) {
    const { data, error } = await supabase.from("people").select(select).order("name").limit(SEARCH_LIMIT);
    if (error) throw new Error(`担当者の検索に失敗しました: ${error.message}`);
    return (data ?? []).map(toPersonSearchResult);
  }

  // .or()に検索語をそのまま埋め込むと、カンマ・括弧等PostgRESTのフィルタ構文上
  // 意味を持つ文字を含む入力でフィルタ条件そのものを改変されてしまう
  // (PostgREST filter injection)。氏名・メール別々のilikeクエリに分けて実行し、
  // 結果をアプリ側でマージすることでこれを避ける(値渡しのため安全)。
  const [byName, byEmail] = await Promise.all([
    supabase.from("people").select(select).ilike("name", `%${trimmed}%`).order("name").limit(SEARCH_LIMIT),
    supabase.from("people").select(select).ilike("email", `%${trimmed}%`).order("name").limit(SEARCH_LIMIT),
  ]);
  if (byName.error) throw new Error(`担当者の検索に失敗しました: ${byName.error.message}`);
  if (byEmail.error) throw new Error(`担当者の検索に失敗しました: ${byEmail.error.message}`);

  const byId = new Map<string, PersonSearchRow>();
  for (const row of [...(byName.data ?? []), ...(byEmail.data ?? [])]) {
    byId.set(row.id, row);
  }

  return [...byId.values()].slice(0, SEARCH_LIMIT).map(toPersonSearchResult);
}

/**
 * 企業担当者選択モーダルからのインライン新規登録(商談・案件作成画面: SCREEN_SPEC.md
 * 「商談管理」「案件管理」)。企業は既存企業を選ぶか、その場でCreateCompanyInlineForm経由
 * で新規登録した企業をcompany_idとして正式に紐付ける(以前は自由入力のcompany_name_rawの
 * みだったが、企業選択モーダルを使う形に統一した)。
 */
export async function createPersonInline(
  name: string,
  companyId: string | null
): Promise<SearchResultItem> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("people")
    .insert({ name, company_id: companyId })
    .select("id, name, company_name_raw, company:companies(name)")
    .single();

  if (error) throw new Error(`担当者の登録に失敗しました: ${error.message}`);
  return { id: data.id, label: data.name, sublabel: data.company?.name ?? data.company_name_raw };
}
