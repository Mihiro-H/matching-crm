import type { Json, JobCategory } from "@/lib/supabase/database.types";
import type { FormFieldRow } from "./types";

export type PersonInsertFromForm = {
  name: string;
  email: string | null;
  phone: string | null;
  company_name_raw: string | null;
};

export type DealInsertFromForm = {
  job_categories: JobCategory[];
  inquiry_body: string | null;
};

export type ParsedFormSubmission = {
  personInsert: PersonInsertFromForm;
  dealInsert: DealInsertFromForm;
  customFields: Record<string, Json>;
};

export type ParseFormSubmissionResult =
  | { ok: true; data: ParsedFormSubmission }
  | { ok: false; error: string };

/**
 * 問い合わせフォーム(SCREEN_SPEC.md「フォーム管理」)からの送信データを、
 * その時点のフォーム構成(fields)に基づいて検証・変換する。
 * ビルトイン項目のうち人物に関するもの(氏名/メール/電話/企業名)はpeopleの
 * インサート用データへ、商談に関するもの(依頼職種/問い合わせ内容)はdealsの
 * インサート用データへ、カスタム項目はdeals.custom_fields(jsonb)へ
 * field_keyをキーとしてマッピングする。
 */
export function parseFormSubmission(
  fields: FormFieldRow[],
  payload: Record<string, unknown>
): ParseFormSubmissionResult {
  const personInsert: PersonInsertFromForm = {
    name: "",
    email: null,
    phone: null,
    company_name_raw: null,
  };
  const dealInsert: DealInsertFromForm = {
    job_categories: [],
    inquiry_body: null,
  };
  const customFields: Record<string, Json> = {};

  for (const field of fields) {
    const raw = payload[field.fieldKey];
    const validated = validateFieldValue(field, raw);
    if (!validated.ok) return validated;

    if (field.isBuiltin) {
      applyBuiltinValue(personInsert, dealInsert, field.fieldKey, validated.value);
    } else if (validated.value !== null) {
      customFields[field.fieldKey] = validated.value;
    }
  }

  if (!personInsert.name.trim()) {
    return { ok: false, error: "「氏名」は必須です。" };
  }

  return { ok: true, data: { personInsert, dealInsert, customFields } };
}

type ValidateResult = { ok: true; value: Json } | { ok: false; error: string };

function validateFieldValue(field: FormFieldRow, raw: unknown): ValidateResult {
  const isEmpty =
    raw === undefined || raw === null || (typeof raw === "string" && raw.trim() === "") ||
    (Array.isArray(raw) && raw.length === 0);

  if (isEmpty) {
    if (field.isRequired) return { ok: false, error: `「${field.label}」は必須です。` };
    return { ok: true, value: field.answerType === "multi_select" ? [] : null };
  }

  if (field.answerType === "multi_select") {
    const values = Array.isArray(raw) ? raw.map(String) : [String(raw)];
    if (field.options) {
      const validValues = new Set(field.options.map((o) => o.value));
      const invalid = values.find((v) => !validValues.has(v));
      if (invalid !== undefined) {
        return { ok: false, error: `「${field.label}」に不正な値があります: ${invalid}` };
      }
    }
    return { ok: true, value: values };
  }

  if (field.answerType === "single_select") {
    const value = String(raw);
    if (field.options && !field.options.some((o) => o.value === value)) {
      return { ok: false, error: `「${field.label}」に不正な値があります: ${value}` };
    }
    return { ok: true, value };
  }

  // text / textarea
  return { ok: true, value: String(raw) };
}

function applyBuiltinValue(
  person: PersonInsertFromForm,
  deal: DealInsertFromForm,
  fieldKey: string,
  value: Json
): void {
  switch (fieldKey) {
    case "name":
      person.name = typeof value === "string" ? value : "";
      break;
    case "email":
      person.email = typeof value === "string" ? value : null;
      break;
    case "phone":
      person.phone = typeof value === "string" ? value : null;
      break;
    case "company_name":
      person.company_name_raw = typeof value === "string" ? value : null;
      break;
    case "job_categories":
      deal.job_categories = Array.isArray(value) ? (value as JobCategory[]) : [];
      break;
    case "inquiry_body":
      deal.inquiry_body = typeof value === "string" ? value : null;
      break;
  }
}
