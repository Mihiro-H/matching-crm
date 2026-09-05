"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth/require-admin";

export type MutationResult = { success: true } | { success: false; error: string };

/** Misoca連携を解除する(保存済みトークンを削除)。管理者限定。 */
export async function disconnectMisoca(): Promise<MutationResult> {
  const authCheck = await requireAdmin();
  if (!authCheck.ok) return { success: false, error: authCheck.error };

  const admin = createSupabaseAdminClient();
  const { error } = await admin.from("misoca_oauth_tokens").delete().eq("id", true);
  if (error) return { success: false, error: error.message };

  revalidatePath("/settings/integrations");
  return { success: true };
}
