import { describe, expect, test } from "vitest";
import { parseFormLeadPayload } from "./parse-form-lead";

describe("parseFormLeadPayload", () => {
  test("parses a well-formed payload", () => {
    const result = parseFormLeadPayload({
      name: "田中太郎",
      email: "tanaka@example.com",
      phone: "090-1234-5678",
      company_name: "株式会社アクメ商事",
      job_categories: ["writer", "designer"],
      inquiry_body: "サイト制作について相談したいです",
    });
    expect(result).toEqual({
      ok: true,
      data: {
        name: "田中太郎",
        email: "tanaka@example.com",
        phone: "090-1234-5678",
        companyNameRaw: "株式会社アクメ商事",
        jobCategories: ["writer", "designer"],
        inquiryBody: "サイト制作について相談したいです",
      },
    });
  });

  test("treats every field except name as optional", () => {
    const result = parseFormLeadPayload({ name: "田中太郎" });
    expect(result).toEqual({
      ok: true,
      data: {
        name: "田中太郎",
        email: null,
        phone: null,
        companyNameRaw: null,
        jobCategories: [],
        inquiryBody: null,
      },
    });
  });

  test("errors when name is missing", () => {
    expect(parseFormLeadPayload({ email: "a@example.com" })).toEqual({
      ok: false,
      error: "nameが空です",
    });
  });

  test("errors when job_categories contains an unrecognized value", () => {
    expect(
      parseFormLeadPayload({ name: "田中太郎", job_categories: ["writer", "bogus"] })
    ).toEqual({ ok: false, error: "job_categoriesに不正な値があります: bogus" });
  });

  test("errors when the payload is not an object", () => {
    expect(parseFormLeadPayload(null)).toEqual({ ok: false, error: "不正なリクエストです" });
    expect(parseFormLeadPayload("string")).toEqual({ ok: false, error: "不正なリクエストです" });
  });
});
