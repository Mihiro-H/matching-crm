import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * URLに使う短い連番(deals.number)から内部的なuuid(deals.id)を解決する
 * (SCREEN_SPEC.md「商談管理」: URLを短くするための対応。外部キー参照は
 * 引き続きuuidを使うため、ルーティングの入り口でこの変換が必要になる)。
 * 存在しない/不正な値の場合はnullを返し、呼び出し側でnotFound()にする。
 */
export async function resolveDealId(numberParam: string): Promise<string | null> {
  const number = Number(numberParam);
  if (!Number.isInteger(number)) return null;

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from("deals").select("id").eq("number", number).maybeSingle();
  return data?.id ?? null;
}
