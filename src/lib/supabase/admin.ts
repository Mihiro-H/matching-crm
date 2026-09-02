import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

/**
 * service role keyを使うクライアント。RLSを完全にバイパスするため、
 * auth.users検索など管理者専用の操作でのみ、厳密にスコープを絞って使うこと。
 * 絶対にクライアントバンドルに含めない("server-only"パッケージでビルド時に強制)。
 */
export function createSupabaseAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Supabase管理者クライアントが未接続です。NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY を.envに設定してください。"
    );
  }

  return createClient<Database>(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
