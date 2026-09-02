import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "./database.types";

/**
 * Supabaseプロジェクトが未接続の環境(.envにURL/anon keyが未設定)かどうか。
 * TECH_STACK.md: Supabaseプロジェクトはこれから作成する運用のため、
 * 未接続時は各画面が例外で落ちるのではなく「未接続」状態を表示する。
 */
export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

/**
 * Server Components / Server Actions / Route Handlers から使う
 * ユーザーセッション付きのSupabaseクライアント(RLSが有効な状態で動作する)。
 * 呼び出し前に isSupabaseConfigured() で接続可否を確認すること。
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "Supabaseが未接続です。NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY を.envに設定してください。"
    );
  }

  return createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (cookiesToSet) => {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Server Component から呼ばれた場合、cookieの書き込みはできない
          // (ミドルウェアでセッション更新している前提なら無視して問題ない)
        }
      },
    },
  });
}
