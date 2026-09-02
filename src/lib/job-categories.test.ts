import { describe, expect, test } from "vitest";
import { formatRoleSummary } from "./job-categories";

describe("formatRoleSummary", () => {
  test("joins each job category with its headcount using a middle dot", () => {
    expect(
      formatRoleSummary([
        { job_category: "writer", headcount: 1 },
        { job_category: "designer", headcount: 1 },
      ])
    ).toBe("ライター1・デザイナー1");
  });

  test("handles a single role", () => {
    expect(formatRoleSummary([{ job_category: "photographer", headcount: 2 }])).toBe(
      "フォトグラファー2"
    );
  });

  test("returns an empty string when there are no roles", () => {
    expect(formatRoleSummary([])).toBe("");
  });
});
