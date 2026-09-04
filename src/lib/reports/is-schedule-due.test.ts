import { describe, expect, test } from "vitest";
import { isScheduleDueNow } from "./is-schedule-due";

describe("isScheduleDueNow", () => {
  const weeklySchedule = { frequency: "weekly" as const, dayOfWeek: 3, dayOfMonth: null, timeOfDay: "10:00:00" };

  test("is due when now falls within the hour the schedule targets", () => {
    // 2026-09-02 is a Wednesday. Checked at 10:05, i.e. within the 10:00 hour.
    const now = new Date("2026-09-02T10:05:00.000Z");
    expect(isScheduleDueNow(weeklySchedule, now)).toBe(true);
  });

  test("is due exactly at the target time (inclusive boundary)", () => {
    const now = new Date("2026-09-02T10:00:00.000Z");
    expect(isScheduleDueNow(weeklySchedule, now)).toBe(true);
  });

  test("stays due for the rest of that day (default window is ~25h, matching a once-daily cron rather than hourly)", () => {
    // 2026-09-02 10:00 UTCが対象。同じ水曜日の夜でもまだ「直近に発火時刻があった」扱いになる
    // (cronがVercel Hobbyプランの制約で1日1回しか動かせない前提。次回実行チェックの
    // タイミング次第では正確なtime_of_day通りには送信されない=許容している仕様)。
    const now = new Date("2026-09-02T20:00:00.000Z");
    expect(isScheduleDueNow(weeklySchedule, now)).toBe(true);
  });

  test("does not re-fire the same occurrence once it rolls over to next week's target (avoids double-firing)", () => {
    // 2026-09-04(金)時点では、今週の水曜10:00は25時間の窓より前になっており、
    // computeNextRunAtは既に来週の水曜へ進んでいるため発火しない。
    const now = new Date("2026-09-04T10:05:00.000Z");
    expect(isScheduleDueNow(weeklySchedule, now)).toBe(false);
  });

  test("monthly schedule is due on its day", () => {
    const monthlySchedule = { frequency: "monthly" as const, dayOfWeek: null, dayOfMonth: 15, timeOfDay: "09:00:00" };
    const now = new Date("2026-09-15T09:10:00.000Z");
    expect(isScheduleDueNow(monthlySchedule, now)).toBe(true);
  });

  test("monthly schedule with day 31 is due on the last day of a shorter month", () => {
    const monthlySchedule = { frequency: "monthly" as const, dayOfWeek: null, dayOfMonth: 31, timeOfDay: "09:00:00" };
    const now = new Date("2026-09-30T09:00:00.000Z");
    expect(isScheduleDueNow(monthlySchedule, now)).toBe(true);
  });
});
