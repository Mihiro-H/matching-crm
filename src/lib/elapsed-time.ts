const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** 商談・担当者管理カード(SCREEN_SPEC.md 2章)の「経過時間」表示 */
export function formatElapsedTime(createdAt: string, now: Date = new Date()): string {
  const diffMs = now.getTime() - new Date(createdAt).getTime();

  if (diffMs < MINUTE) return "たった今";
  if (diffMs < HOUR) return `${Math.floor(diffMs / MINUTE)}分前`;
  if (diffMs < DAY) return `${Math.floor(diffMs / HOUR)}時間前`;
  return `${Math.floor(diffMs / DAY)}日前`;
}
