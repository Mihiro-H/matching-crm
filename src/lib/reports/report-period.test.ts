import { describe, expect, test } from "vitest";
import { computeReportPeriod, formatReportPeriodLabel } from "./report-period";

describe("computeReportPeriod", () => {
  test("weekly report covers the trailing 7 days up to now", () => {
    const now = new Date("2026-09-15T10:00:00.000Z");
    const period = computeReportPeriod("weekly", now);
    expect(period.startIso).toBe("2026-09-08T10:00:00.000Z");
    expect(period.endIso).toBe("2026-09-15T10:00:00.000Z");
  });

  test("monthly report covers the trailing 30 days up to now", () => {
    const now = new Date("2026-09-15T10:00:00.000Z");
    const period = computeReportPeriod("monthly", now);
    expect(period.startIso).toBe("2026-08-16T10:00:00.000Z");
    expect(period.endIso).toBe("2026-09-15T10:00:00.000Z");
  });
});

describe("formatReportPeriodLabel", () => {
  test("formats a weekly period as a YYYY/MM/DD〜YYYY/MM/DD label", () => {
    expect(
      formatReportPeriodLabel(
        { startIso: "2026-09-08T10:00:00.000Z", endIso: "2026-09-15T10:00:00.000Z" },
        "weekly"
      )
    ).toBe("2026/09/08〜2026/09/15");
  });

  test("formats a monthly period as the calendar month before the run (SCREEN_SPEC.md 8章の例:「2026年8月」)", () => {
    expect(
      formatReportPeriodLabel(
        { startIso: "2026-08-16T10:00:00.000Z", endIso: "2026-09-15T10:00:00.000Z" },
        "monthly"
      )
    ).toBe("2026年8月");
  });

  test("monthly period label rolls back the year across a January run", () => {
    expect(
      formatReportPeriodLabel(
        { startIso: "2025-12-02T10:00:00.000Z", endIso: "2026-01-01T10:00:00.000Z" },
        "monthly"
      )
    ).toBe("2025年12月");
  });
});
