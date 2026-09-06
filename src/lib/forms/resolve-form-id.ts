import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * URLに使う短い連番(form_definitions.number)から内部的なuuid(form_definitions.id)を解決する
 * (deals/resolve-deal-id.ts・projects/resolve-project-id.tsと同じ理由・同じ方針)。
 * 管理画面(要ログイン)からの利用が前提のため、RLSを経由する通常のサーバークライアントを使う
 * (未ログインの公開フォームは get-public-form.ts が別途adminクライアントで解決する)。
 */
export async function resolveFormId(numberParam: string): Promise<string | null> {
  const number = Number(numberParam);
  if (!Number.isInteger(number)) return null;

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from("form_definitions").select("id").eq("number", number).maybeSingle();
  return data?.id ?? null;
}
