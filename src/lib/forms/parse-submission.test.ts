import { describe, expect, test } from "vitest";
import { parseFormSubmission } from "./parse-submission";
import type { FormFieldRow } from "./types";

const baseFields: FormFieldRow[] = [
  { id: "f1", fieldKey: "name", isBuiltin: true, label: "氏名", answerType: "text", options: null, isRequired: true, sortOrder: 0 },
  { id: "f2", fieldKey: "email", isBuiltin: true, label: "メール", answerType: "text", options: null, isRequired: false, sortOrder: 1 },
  { id: "f3", fieldKey: "company_name", isBuiltin: true, label: "企業名", answerType: "text", options: null, isRequired: false, sortOrder: 2 },
  {
    id: "f4",
    fieldKey: "job_categories",
    isBuiltin: true,
    label: "依頼職種",
    answerType: "multi_select",
    options: [
      { value: "writer", label: "ライター" },
      { value: "designer", label: "デザイナー" },
    ],
    isRequired: false,
    sortOrder: 3,
  },
  { id: "f5", fieldKey: "inquiry_body", isBuiltin: true, label: "問い合わせ内容", answerType: "textarea", options: null, isRequired: false, sortOrder: 4 },
];

describe("parseFormSubmission", () => {
  test("maps builtin person fields to personInsert and deal fields to dealInsert", () => {
    const result = parseFormSubmission(baseFields, {
      name: "田中太郎",
      email: "taro@example.com",
      company_name: "テスト株式会社",
      job_categories: ["writer"],
      inquiry_body: "見積もりが欲しいです",
    });
    expect(result).toEqual({
      ok: true,
      data: {
        personInsert: {
          name: "田中太郎",
          email: "taro@example.com",
          phone: null,
          company_name_raw: "テスト株式会社",
        },
        dealInsert: {
          job_categories: ["writer"],
          inquiry_body: "見積もりが欲しいです",
        },
        customFields: {},
      },
    });
  });

  test("normalizes a phone number submitted without hyphens", () => {
    const fields: FormFieldRow[] = [
      ...baseFields,
      { id: "f6", fieldKey: "phone", isBuiltin: true, label: "電話番号", answerType: "text", options: null, isRequired: false, sortOrder: 5 },
    ];
    const result = parseFormSubmission(fields, { name: "田中太郎", phone: "09012345678" });
    expect(result).toMatchObject({ ok: true, data: { personInsert: { phone: "090-1234-5678" } } });
  });

  test("fails when a required field is missing", () => {
    const result = parseFormSubmission(baseFields, { email: "taro@example.com" });
    expect(result).toEqual({ ok: false, error: "「氏名」は必須です。" });
  });

  test("fails when a required field is an empty string", () => {
    const result = parseFormSubmission(baseFields, { name: "  " });
    expect(result.ok).toBe(false);
  });

  test("rejects a multi_select value outside the configured options", () => {
    const result = parseFormSubmission(baseFields, { name: "田中太郎", job_categories: ["not_a_category"] });
    expect(result).toEqual({ ok: false, error: "「依頼職種」に不正な値があります: not_a_category" });
  });

  test("routes custom (non-builtin) fields into customFields keyed by field_key", () => {
    const fields: FormFieldRow[] = [
      ...baseFields,
      {
        id: "f6",
        fieldKey: "custom_abc123",
        isBuiltin: false,
        label: "ご予算",
        answerType: "single_select",
        options: [
          { value: "under_100k", label: "10万円未満" },
          { value: "over_100k", label: "10万円以上" },
        ],
        isRequired: true,
        sortOrder: 5,
      },
    ];
    const result = parseFormSubmission(fields, { name: "田中太郎", custom_abc123: "over_100k" });
    expect(result).toEqual({
      ok: true,
      data: {
        personInsert: {
          name: "田中太郎",
          email: null,
          phone: null,
          company_name_raw: null,
        },
        dealInsert: {
          job_categories: [],
          inquiry_body: null,
        },
        customFields: { custom_abc123: "over_100k" },
      },
    });
  });

  test("routes the privacy_consent builtin field into customFields (no people/deals column maps to it)", () => {
    const fields: FormFieldRow[] = [
      ...baseFields,
      {
        id: "f7",
        fieldKey: "privacy_consent",
        isBuiltin: true,
        label: "個人情報の取扱いについての同意",
        answerType: "single_select",
        options: [{ value: "agreed", label: "✅個人情報の取扱いについて同意する" }],
        isRequired: true,
        sortOrder: 5,
      },
    ];
    const result = parseFormSubmission(fields, { name: "田中太郎", privacy_consent: "agreed" });
    expect(result).toEqual({
      ok: true,
      data: {
        personInsert: { name: "田中太郎", email: null, phone: null, company_name_raw: null },
        dealInsert: { job_categories: [], inquiry_body: null },
        customFields: { privacy_consent: "agreed" },
      },
    });
  });

  test("fails when privacy_consent is required but not checked", () => {
    const fields: FormFieldRow[] = [
      ...baseFields,
      {
        id: "f7",
        fieldKey: "privacy_consent",
        isBuiltin: true,
        label: "個人情報の取扱いについての同意",
        answerType: "single_select",
        options: [{ value: "agreed", label: "✅個人情報の取扱いについて同意する" }],
        isRequired: true,
        sortOrder: 5,
      },
    ];
    const result = parseFormSubmission(fields, { name: "田中太郎" });
    expect(result).toEqual({ ok: false, error: "「個人情報の取扱いについての同意」は必須です。" });
  });

  test("rejects a single_select value outside the configured options", () => {
    const fields: FormFieldRow[] = [
      baseFields[0],
      {
        id: "f6",
        fieldKey: "custom_abc123",
        isBuiltin: false,
        label: "ご予算",
        answerType: "single_select",
        options: [{ value: "under_100k", label: "10万円未満" }],
        isRequired: false,
        sortOrder: 5,
      },
    ];
    const result = parseFormSubmission(fields, { name: "田中太郎", custom_abc123: "not_an_option" });
    expect(result).toEqual({ ok: false, error: "「ご予算」に不正な値があります: not_an_option" });
  });
});
