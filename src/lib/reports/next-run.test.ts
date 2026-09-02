import { describe, expect, test } from "vitest";
import { computeNextRunAt } from "./next-run";

describe("computeNextRunAt", () => {
  describe("weekly", () => {
    test("returns this week's occurrence when it is still ahead of now", () => {
      // 2026-09-02 is a Wednesday (day 3). now is Monday 2026-08-31 09:00 UTC.
      const now = new Date("2026-08-31T09:00:00.000Z");
      const next = computeNextRunAt(
        { frequency: "weekly", dayOfWeek: 3, dayOfMonth: null, timeOfDay: "10:00:00" },
        now
      );
      expect(next.toISOString()).toBe("2026-09-02T10:00:00.000Z");
    });

    test("rolls over to next week when this week's occurrence has already passed", () => {
      // now is Wednesday 2026-09-02 11:00, after the 10:00 slot the same day.
      const now = new Date("2026-09-02T11:00:00.000Z");
      const next = computeNextRunAt(
        { frequency: "weekly", dayOfWeek: 3, dayOfMonth: null, timeOfDay: "10:00:00" },
        now
      );
      expect(next.toISOString()).toBe("2026-09-09T10:00:00.000Z");
    });
  });

  describe("monthly", () => {
    test("returns this month's occurrence when it is still ahead of now", () => {
      const now = new Date("2026-09-01T00:00:00.000Z");
      const next = computeNextRunAt(
        { frequency: "monthly", dayOfWeek: null, dayOfMonth: 15, timeOfDay: "09:00:00" },
        now
      );
      expect(next.toISOString()).toBe("2026-09-15T09:00:00.000Z");
    });

    test("rolls over to next month when this month's occurrence has already passed", () => {
      const now = new Date("2026-09-20T00:00:00.000Z");
      const next = computeNextRunAt(
        { frequency: "monthly", dayOfWeek: null, dayOfMonth: 15, timeOfDay: "09:00:00" },
        now
      );
      expect(next.toISOString()).toBe("2026-10-15T09:00:00.000Z");
    });

    test("clamps day_of_month 31 to the last actual day of a shorter month (月末処理)", () => {
      // September has 30 days.
      const now = new Date("2026-09-01T00:00:00.000Z");
      const next = computeNextRunAt(
        { frequency: "monthly", dayOfWeek: null, dayOfMonth: 31, timeOfDay: "09:00:00" },
        now
      );
      expect(next.toISOString()).toBe("2026-09-30T09:00:00.000Z");
    });

    test("clamps day_of_month 31 for February in a non-leap year", () => {
      const now = new Date("2026-02-01T00:00:00.000Z");
      const next = computeNextRunAt(
        { frequency: "monthly", dayOfWeek: null, dayOfMonth: 31, timeOfDay: "09:00:00" },
        now
      );
      expect(next.toISOString()).toBe("2026-02-28T09:00:00.000Z");
    });
  });
});
