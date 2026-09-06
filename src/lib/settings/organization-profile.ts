import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type OrganizationProfile = { companyName: string | null; logoUrl: string | null };

const EMPTY_PROFILE: OrganizationProfile = { companyName: null, logoUrl: null };

/** 設定 > 会社情報(ログイン済みユーザーからの利用)。 */
export async function getOrganizationProfile(): Promise<OrganizationProfile> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("organization_settings")
    .select("company_name, logo_url")
    .eq("id", true)
    .maybeSingle();

  if (!data) return EMPTY_PROFILE;
  return { companyName: data.company_name, logoUrl: data.logo_url };
}

/**
 * 公開問い合わせフォーム(/contact/[number])向けの会社情報取得。
 * 未ログインの訪問者からのアクセスを想定するため、get-public-form.tsと同じ方針で
 * adminクライアントを使う(organization_settingsのRLSはauthenticated限定のため)。
 */
export async function getPublicOrganizationProfile(): Promise<OrganizationProfile> {
  const admin = createSupabaseAdminClient();
  const { data } = await admin
    .from("organization_settings")
    .select("company_name, logo_url")
    .eq("id", true)
    .maybeSingle();

  if (!data) return EMPTY_PROFILE;
  return { companyName: data.company_name, logoUrl: data.logo_url };
}
