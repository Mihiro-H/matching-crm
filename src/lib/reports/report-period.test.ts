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
  test("formats the period as a YYYY/MM/DD〜YYYY/MM/DD label", () => {
    expect(
      formatReportPeriodLabel({
        startIso: "2026-09-08T10:00:00.000Z",
        endIso: "2026-09-15T10:00:00.000Z",
      })
    ).toBe("2026/09/08〜2026/09/15");
  });
});
