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

const dateTimeFormatter = new Intl.DateTimeFormat("ja-JP", {
  timeZone: "Asia/Tokyo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

/** ISO日時文字列を日本時間の "YYYY/MM/DD HH:MM" 形式に変換する(通知一覧の日時表示など) */
export function formatDateTimeJa(iso: string): string {
  const parts = dateTimeFormatter.formatToParts(new Date(iso));
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}/${get("month")}/${get("day")} ${get("hour")}:${get("minute")}`;
}

/** 議事録一覧カードの「AI要約の冒頭」表示(SCREEN_SPEC.md 6章)など、長文の先頭を切り出す */
export function excerpt(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}…`;
}
