import type { Json } from "@/lib/supabase/database.types";

/**
 * フォームのカスタム項目の回答値(value)を、選択式(single_select/multi_select)であれば
 * 選択肢のlabelへ変換する。選択式でない項目(text/textarea)やoptionsが無い場合は
 * valueをそのまま返す。商談詳細の「フォームの回答内容」・商談管理一覧の
 * 「カスタム項目」列の両方で使う共通処理。
 */
export function resolveFieldValueLabel(value: Json, options: unknown): Json {
  if (!Array.isArray(options) || value === null) return value;
  const labelByValue = new Map(
    (options as { value: string; label: string }[]).map((o) => [o.value, o.label])
  );
  if (Array.isArray(value)) {
    return value.map((v) => labelByValue.get(String(v)) ?? String(v));
  }
  return labelByValue.get(String(value)) ?? value;
}
