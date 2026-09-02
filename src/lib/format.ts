const currencyFormatter = new Intl.NumberFormat("ja-JP", {
  style: "currency",
  currency: "JPY",
  maximumFractionDigits: 0,
});

export function formatCurrencyJPY(amount: number): string {
  return currencyFormatter.format(amount);
}

/** ISO日付/日時文字列を "YYYY/MM/DD" 形式に変換する */
export function formatDateJa(iso: string): string {
  return iso.slice(0, 10).replace(/-/g, "/");
}

/** 議事録一覧カードの「AI要約の冒頭」表示(SCREEN_SPEC.md 6章)など、長文の先頭を切り出す */
export function excerpt(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}…`;
}
