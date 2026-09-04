"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireEditAccess } from "@/lib/auth/require-edit";
import type { CompanyStatus } from "@/lib/supabase/database.types";

export type MutationResult = { success: true } | { success: false; error: string };

/** 企業詳細ヘッダーの基本項目編集(企業名/業種/ステータス/初回接触日/プラットフォームアカウントID) */
export async function updateCompany(
  companyId: string,
  input: {
    name: string;
    industry: string | null;
    status: CompanyStatus;
    firstContactDate: string | null;
    platformAccountId: string | null;
  }
): Promise<MutationResult> {
  const authCheck = await requireEditAccess("companies");
  if (!authCheck.ok) return { success: false, error: authCheck.error };

  if (!input.name.trim()) {
    return { success: false, error: "企業名を入力してください。" };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("companies")
    .update({
      name: input.name.trim(),
      industry: input.industry?.trim() || null,
      status: input.status,
      first_contact_date: input.firstContactDate,
      platform_account_id: input.platformAccountId?.trim() || null,
    })
    .eq("id", companyId);

  if (error) return { success: false, error: error.message };

  revalidatePath(`/companies/${companyId}`);
  revalidatePath("/companies");
  return { success: true };
}
