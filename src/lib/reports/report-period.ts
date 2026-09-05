import type { ReportFrequency } from "@/lib/supabase/database.types";
import { formatDateJa } from "@/lib/format";

export type ReportPeriod = { startIso: string; endIso: string };

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * レポート集計対象期間(SCREEN_SPEC.md 8章)。
 * 「今回の実行時点から遡ってどれだけの期間を集計するか」はドキュメントに
 * 明記がないため、頻度に応じた直近日数(週次=7日、月次=30日)として確定させる。
 */
export function computeReportPeriod(frequency: ReportFrequency, now: Date): ReportPeriod {
  const days = frequency === "weekly" ? 7 : 30;
  const start = new Date(now.getTime() - days * DAY_MS);
  return { startIso: start.toISOString(), endIso: now.toISOString() };
}

/**
 * 通知文面の{{period}}プレースホルダー、レポート表示画面の「対象期間」用ラベル。
 * 週次は開始〜終了の日付範囲、月次は「集計期間はendIsoの前月」という前提のもと
 * 「YYYY年M月」の1語で表す(SCREEN_SPEC.md 8章の例:「2026年8月」。
 * computeReportPeriodの月次は「実行時点から遡って30日」の近似のため、
 * 厳密な暦月とは一致しない場合があるが、表示上は実行月の前月として扱う)。
 */
export function formatReportPeriodLabel(period: ReportPeriod, frequency: ReportFrequency): string {
  if (frequency === "monthly") {
    const end = new Date(period.endIso);
    const year = end.getUTCFullYear();
    const month = end.getUTCMonth(); // 0-indexed; 前月を指すのでそのまま使う
    const prevMonthDate = new Date(Date.UTC(year, month - 1, 1));
    return `${prevMonthDate.getUTCFullYear()}年${prevMonthDate.getUTCMonth() + 1}月`;
  }
  return `${formatDateJa(period.startIso)}〜${formatDateJa(period.endIso)}`;
}
