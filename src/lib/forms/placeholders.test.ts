import { describe, expect, test } from "vitest";
import { getFieldPlaceholder } from "./placeholders";
import type { FormFieldRow } from "./types";

function field(overrides: Partial<FormFieldRow>): FormFieldRow {
  return {
    id: "f1",
    fieldKey: "custom_abc",
    isBuiltin: false,
    label: "テスト項目",
    answerType: "text",
    options: null,
    isRequired: false,
    sortOrder: 0,
    ...overrides,
  };
}

describe("getFieldPlaceholder", () => {
  test("returns a specific example for known builtin text fields", () => {
    expect(getFieldPlaceholder(field({ fieldKey: "name", isBuiltin: true }))).toBe("例: 山田 太郎");
    expect(getFieldPlaceholder(field({ fieldKey: "email", isBuiltin: true }))).toBe("例: example@mail.co.jp");
    expect(getFieldPlaceholder(field({ fieldKey: "phone", isBuiltin: true }))).toBe("例: 090-1234-5678");
    expect(getFieldPlaceholder(field({ fieldKey: "company_name", isBuiltin: true }))).toBe("例: 株式会社〇〇");
  });

  test("returns a textarea-appropriate placeholder for the builtin inquiry_body field", () => {
    expect(getFieldPlaceholder(field({ fieldKey: "inquiry_body", isBuiltin: true, answerType: "textarea" }))).toBe(
      "お問い合わせ内容をご記入ください"
    );
  });

  test("falls back to a generic placeholder for custom text/textarea fields", () => {
    expect(getFieldPlaceholder(field({ answerType: "text" }))).toBe("回答を入力してください");
    expect(getFieldPlaceholder(field({ answerType: "textarea" }))).toBe("回答をご記入ください");
  });

  test("returns undefined for select-type fields (native placeholder has no meaning there)", () => {
    expect(getFieldPlaceholder(field({ answerType: "single_select" }))).toBeUndefined();
    expect(getFieldPlaceholder(field({ answerType: "multi_select" }))).toBeUndefined();
  });

  test("falls back to the generic placeholder for a builtin field with no specific example (privacy_consent is select-type so this covers a hypothetical future builtin text field)", () => {
    expect(getFieldPlaceholder(field({ fieldKey: "job_categories", isBuiltin: true, answerType: "text" }))).toBe(
      "回答を入力してください"
    );
  });
});
