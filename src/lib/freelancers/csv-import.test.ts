import { describe, expect, test } from "vitest";
import { parseFreelancerCsvRow } from "./csv-import";

describe("parseFreelancerCsvRow", () => {
  test("parses a valid row with multiple job categories", () => {
    const result = parseFreelancerCsvRow({
      platform_freelancer_id: "PF-001",
      name: "田中太郎",
      email: "tanaka@example.com",
      job_categories: "writer,designer",
    });
    expect(result).toEqual({
      ok: true,
      data: {
        platform_freelancer_id: "PF-001",
        name: "田中太郎",
        email: "tanaka@example.com",
        job_categories: ["writer", "designer"],
      },
    });
  });

  test("treats email and job_categories as optional", () => {
    const result = parseFreelancerCsvRow({ platform_freelancer_id: "PF-002", name: "鈴木花子" });
    expect(result).toEqual({
      ok: true,
      data: {
        platform_freelancer_id: "PF-002",
        name: "鈴木花子",
        email: null,
        job_categories: null,
      },
    });
  });

  test("errors when platform_freelancer_id is missing", () => {
    const result = parseFreelancerCsvRow({ name: "田中太郎" });
    expect(result).toEqual({ ok: false, error: "platform_freelancer_idが空です" });
  });

  test("errors when name is missing", () => {
    const result = parseFreelancerCsvRow({ platform_freelancer_id: "PF-001" });
    expect(result).toEqual({ ok: false, error: "nameが空です" });
  });

  test("accepts the app's own Japanese labels for job_categories", () => {
    const result = parseFreelancerCsvRow({
      platform_freelancer_id: "PF-003",
      name: "佐藤次郎",
      job_categories: "ライター,デザイナー",
    });
    expect(result).toEqual({
      ok: true,
      data: {
        platform_freelancer_id: "PF-003",
        name: "佐藤次郎",
        email: null,
        job_categories: ["writer", "designer"],
      },
    });
  });

  test("accepts common synonym labels not used elsewhere in the app (e.g. カメラマン for photographer)", () => {
    const result = parseFreelancerCsvRow({
      platform_freelancer_id: "PF-004",
      name: "高橋さゆり",
      job_categories: "カメラマン,マーケター",
    });
    expect(result).toEqual({
      ok: true,
      data: {
        platform_freelancer_id: "PF-004",
        name: "高橋さゆり",
        email: null,
        job_categories: ["photographer", "marketer"],
      },
    });
  });

  test("accepts a mix of English keys and Japanese labels in the same row", () => {
    const result = parseFreelancerCsvRow({
      platform_freelancer_id: "PF-005",
      name: "伊藤誠",
      job_categories: "writer,デザイナー",
    });
    expect(result).toMatchObject({ ok: true, data: { job_categories: ["writer", "designer"] } });
  });

  test("errors when job_categories contains an unrecognized value", () => {
    const result = parseFreelancerCsvRow({
      platform_freelancer_id: "PF-001",
      name: "田中太郎",
      job_categories: "writer,unknown_category",
    });
    expect(result).toEqual({ ok: false, error: "job_categoriesに不正な値があります: unknown_category" });
  });
});
