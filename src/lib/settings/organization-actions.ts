"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/require-admin";

export type MutationResult = { success: true } | { success: false; error: string };

/**
 * 会社情報(公開フォーム右上のロゴ・会社名表示、SCREEN_SPEC.md「フォーム管理」)の更新。
 * organization_settingsは常に1行(id=true固定)なのでupsertする。
 */
export async function updateOrganizationProfile(
  companyName: string,
  logoUrl: string
): Promise<MutationResult> {
  const authCheck = await requireAdmin();
  if (!authCheck.ok) return { success: false, error: authCheck.error };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("organization_settings").upsert({
    id: true,
    company_name: companyName.trim() || null,
    logo_url: logoUrl.trim() || null,
    updated_at: new Date().toISOString(),
  });

  if (error) return { success: false, error: error.message };

  revalidatePath("/settings/organization");
  // 動的セグメントの全ページ分をまとめて再検証する(Next.jsのrevalidatePathのpage指定は
  // このように角括弧付きのルートパターンをそのまま渡す)。
  revalidatePath("/contact/[formId]", "page");
  return { success: true };
}
