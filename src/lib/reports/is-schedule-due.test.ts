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

  test("is not due again one hour later (avoids double-firing)", () => {
    const now = new Date("2026-09-02T11:00:00.000Z");
    expect(isScheduleDueNow(weeklySchedule, now)).toBe(false);
  });

  test("is not due on a different day", () => {
    const now = new Date("2026-09-03T10:05:00.000Z");
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
