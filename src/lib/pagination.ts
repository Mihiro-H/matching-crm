// テーブル形式の一覧共通のページサイズ(SCREEN_SPEC.md「一覧共通UI」)。
export const PAGE_SIZE = 20;

/** クエリパラメータのpageを1始まりの正の整数として解釈する(不正な値は1にフォールバック)。 */
export function parsePageParam(value: string | undefined): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
}

/** Supabaseの.range(from, to)に渡す範囲を計算する(0始まり、両端含む)。 */
export function rangeForPage(page: number, pageSize: number = PAGE_SIZE): [number, number] {
  const from = (page - 1) * pageSize;
  return [from, from + pageSize - 1];
}
