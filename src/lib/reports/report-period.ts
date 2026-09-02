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

/** 通知文面の{{period}}プレースホルダー用ラベル */
export function formatReportPeriodLabel(period: ReportPeriod): string {
  return `${formatDateJa(period.startIso)}〜${formatDateJa(period.endIso)}`;
}
