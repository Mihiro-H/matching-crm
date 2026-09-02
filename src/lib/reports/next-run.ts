import type { ReportFrequency } from "@/lib/supabase/database.types";

export type ScheduleInput = {
  frequency: ReportFrequency;
  dayOfWeek: number | null;
  dayOfMonth: number | null;
  timeOfDay: string; // "HH:mm:ss" (UTC基準で解釈する)
};

function lastDayOfMonth(year: number, monthIndex: number): number {
  // monthIndex+1の月の0日目 = monthIndexの月の末日
  return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
}

function parseTimeOfDay(timeOfDay: string): { hours: number; minutes: number; seconds: number } {
  const [hours, minutes, seconds] = timeOfDay.split(":").map(Number);
  return { hours, minutes: minutes ?? 0, seconds: seconds ?? 0 };
}

/**
 * report_schedules(DB_SCHEMA.md)から次回実行日時を計算する(UTC基準)。
 *
 * 月末処理(DB_SCHEMA.md「未確定・要確認事項」で保留になっていた論点):
 * day_of_monthがその月の末日を超える場合(例: 31日指定でも2月しかない月)は
 * その月の末日にクランプする、という方針で確定させる。
 *
 * 注意: JST基準の暦日/曜日とは厳密には一致しない(UTC基準で計算するため)。
 * 本番運用でJST基準の厳密な判定が必要になった場合は要調整(getMonthRangeと同様の制約)。
 */
export function computeNextRunAt(schedule: ScheduleInput, now: Date): Date {
  const { hours, minutes, seconds } = parseTimeOfDay(schedule.timeOfDay);

  if (schedule.frequency === "weekly") {
    if (schedule.dayOfWeek === null) {
      throw new Error("weekly頻度にはday_of_weekが必要です");
    }
    const candidate = new Date(now);
    const currentDay = candidate.getUTCDay();
    const daysUntilTarget = (schedule.dayOfWeek - currentDay + 7) % 7;
    candidate.setUTCDate(candidate.getUTCDate() + daysUntilTarget);
    candidate.setUTCHours(hours, minutes, seconds, 0);

    if (candidate.getTime() <= now.getTime()) {
      candidate.setUTCDate(candidate.getUTCDate() + 7);
    }
    return candidate;
  }

  // monthly
  if (schedule.dayOfMonth === null) {
    throw new Error("monthly頻度にはday_of_monthが必要です");
  }

  function occurrenceInMonth(year: number, monthIndex: number): Date {
    const day = Math.min(schedule.dayOfMonth as number, lastDayOfMonth(year, monthIndex));
    return new Date(Date.UTC(year, monthIndex, day, hours, minutes, seconds));
  }

  const thisMonth = occurrenceInMonth(now.getUTCFullYear(), now.getUTCMonth());
  if (thisMonth.getTime() > now.getTime()) {
    return thisMonth;
  }
  return occurrenceInMonth(now.getUTCFullYear(), now.getUTCMonth() + 1);
}
