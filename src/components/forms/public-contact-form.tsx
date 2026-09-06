"use client";

import { useState } from "react";
import { submitPublicForm } from "@/lib/forms/public-actions";
import { getFieldPlaceholder } from "@/lib/forms/placeholders";
import { PRIVACY_CONSENT_NOTICE, PRIVACY_CONSENT_OPTION_VALUE } from "@/lib/forms/builtin-fields";
import type { FormFieldRow } from "@/lib/forms/types";

const INPUT_CLASS =
  "rounded-md border border-neutral-200 bg-neutral-0 px-3 py-2 text-sm text-neutral-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100";

type FieldValue = string | string[];
type Values = Record<string, FieldValue>;

function initialValues(fields: FormFieldRow[]): Values {
  const values: Values = {};
  for (const field of fields) {
    values[field.fieldKey] = field.answerType === "multi_select" ? [] : "";
  }
  return values;
}

function isFieldEmpty(field: FormFieldRow, value: FieldValue): boolean {
  if (Array.isArray(value)) return value.length === 0;
  return value.trim() === "";
}

/** 選択肢(single_select/multi_select)の値から表示用ラベルへ変換する。 */
function optionLabel(field: FormFieldRow, value: string): string {
  return field.options?.find((o) => o.value === value)?.label ?? value;
}

/**
 * 公開問い合わせフォーム(/contact/[number])の入力ウィザード本体。
 * 入力→確認→送信の3ステップをクライアント側のReact stateだけで管理する
 * (確認画面から「内容を修正する」で戻っても入力済みの値が消えないようにするため)。
 * fieldsは呼び出し元(page.tsx)で「個人情報の取扱いへの同意」が必ず最後に来るよう
 * 並べ替え済みのものを渡してもらう。
 */
export function PublicContactForm({ formId, fields }: { formId: string; fields: FormFieldRow[] }) {
  const [step, setStep] = useState<"input" | "confirm" | "done">("input");
  const [values, setValues] = useState<Values>(() => initialValues(fields));
  const [validationError, setValidationError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function setValue(fieldKey: string, value: FieldValue) {
    setValues((prev) => ({ ...prev, [fieldKey]: value }));
  }

  function toggleMultiSelectValue(fieldKey: string, optionValue: string, checked: boolean) {
    setValues((prev) => {
      const current = (prev[fieldKey] as string[] | undefined) ?? [];
      const next = checked ? [...current, optionValue] : current.filter((v) => v !== optionValue);
      return { ...prev, [fieldKey]: next };
    });
  }

  function handleProceedToConfirm(e: React.FormEvent) {
    e.preventDefault();
    for (const field of fields) {
      if (field.isRequired && isFieldEmpty(field, values[field.fieldKey])) {
        setValidationError(`「${field.label}」は必須です。`);
        return;
      }
    }
    setValidationError(null);
    setStep("confirm");
  }

  async function handleSubmit() {
    setIsSubmitting(true);
    setSubmitError(null);
    const result = await submitPublicForm(formId, values);
    setIsSubmitting(false);
    if (!result.success) {
      setSubmitError(result.error);
      return;
    }
    setStep("done");
  }

  if (step === "done") {
    return (
      <div className="rounded-lg border border-success-bg bg-success-bg p-6 text-sm text-success-text">
        お問い合わせありがとうございました。担当者より追ってご連絡いたします。
      </div>
    );
  }

  if (step === "confirm") {
    return (
      <div className="flex flex-col gap-4 rounded-lg border border-neutral-200 bg-neutral-0 p-6">
        <p className="text-sm text-neutral-600">入力内容をご確認ください。</p>
        {submitError && <p className="rounded-md bg-danger-bg px-3 py-2 text-sm text-danger-text">{submitError}</p>}
        <dl className="flex flex-col gap-3">
          {fields.map((field) => {
            const value = values[field.fieldKey];
            const displayValue = Array.isArray(value)
              ? value.map((v) => optionLabel(field, v)).join("、") || "(未回答)"
              : field.answerType === "single_select"
                ? value
                  ? optionLabel(field, value)
                  : "(未回答)"
                : value || "(未回答)";
            return (
              <div key={field.id}>
                <dt className="text-xs text-neutral-600">{field.label}</dt>
                <dd className="whitespace-pre-wrap text-sm text-neutral-900">{displayValue}</dd>
              </div>
            );
          })}
        </dl>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setStep("input")}
            disabled={isSubmitting}
            className="rounded-md border border-neutral-200 bg-neutral-0 px-4 py-2 text-sm text-neutral-600 hover:bg-page-bg disabled:opacity-40"
          >
            内容を修正する
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="rounded-md bg-primary-500 px-4 py-2 text-sm text-neutral-0 disabled:opacity-40"
          >
            {isSubmitting ? "送信中..." : "送信する"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleProceedToConfirm}
      className="flex flex-col gap-4 rounded-lg border border-neutral-200 bg-neutral-0 p-6"
    >
      {validationError && (
        <p className="rounded-md bg-danger-bg px-3 py-2 text-sm text-danger-text">{validationError}</p>
      )}
      {fields.map((field) => (
        <FieldInput
          key={field.id}
          field={field}
          value={values[field.fieldKey]}
          onChange={(value) => setValue(field.fieldKey, value)}
          onToggleMultiSelect={(optionValue, checked) =>
            toggleMultiSelectValue(field.fieldKey, optionValue, checked)
          }
        />
      ))}
      <button type="submit" className="self-start rounded-md bg-primary-500 px-4 py-2 text-sm text-neutral-0">
        確認画面へ
      </button>
    </form>
  );
}

function FieldInput({
  field,
  value,
  onChange,
  onToggleMultiSelect,
}: {
  field: FormFieldRow;
  value: FieldValue;
  onChange: (value: FieldValue) => void;
  onToggleMultiSelect: (optionValue: string, checked: boolean) => void;
}) {
  const requiredMark = field.isRequired && <span className="ml-1 text-danger-text">*</span>;

  if (field.fieldKey === "privacy_consent") {
    const checked = value === PRIVACY_CONSENT_OPTION_VALUE;
    return (
      <div className="flex flex-col gap-2 rounded-md border border-neutral-100 bg-page-bg p-4">
        <p className="whitespace-pre-line text-sm text-neutral-900">{PRIVACY_CONSENT_NOTICE}</p>
        <label className="flex items-center gap-2 text-sm text-neutral-900">
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => onChange(e.target.checked ? PRIVACY_CONSENT_OPTION_VALUE : "")}
            className="h-4 w-4 rounded border-neutral-200 text-primary-500 focus:ring-primary-100"
          />
          {(field.options ?? [])[0]?.label ?? "同意する"}
        </label>
      </div>
    );
  }

  if (field.answerType === "textarea") {
    return (
      <label className="flex flex-col gap-1">
        <span className="text-sm text-neutral-900">
          {field.label}
          {requiredMark}
        </span>
        <textarea
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={getFieldPlaceholder(field)}
          rows={4}
          className={INPUT_CLASS}
        />
      </label>
    );
  }

  if (field.answerType === "single_select") {
    return (
      <label className="flex flex-col gap-1">
        <span className="text-sm text-neutral-900">
          {field.label}
          {requiredMark}
        </span>
        <select value={(value as string) ?? ""} onChange={(e) => onChange(e.target.value)} className={INPUT_CLASS}>
          <option value="">選択してください</option>
          {(field.options ?? []).map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>
    );
  }

  if (field.answerType === "multi_select") {
    const selected = (value as string[]) ?? [];
    return (
      <fieldset className="flex flex-col gap-1">
        <legend className="text-sm text-neutral-900">
          {field.label}
          {requiredMark}
        </legend>
        {(field.options ?? []).map((o) => (
          <label key={o.value} className="flex items-center gap-2 text-sm text-neutral-900">
            <input
              type="checkbox"
              checked={selected.includes(o.value)}
              onChange={(e) => onToggleMultiSelect(o.value, e.target.checked)}
              className="h-4 w-4 rounded border-neutral-200 text-primary-500 focus:ring-primary-100"
            />
            {o.label}
          </label>
        ))}
      </fieldset>
    );
  }

  // text(ビルトインのメールアドレスだけはtype="email"にして簡易バリデーションを効かせる)
  return (
    <label className="flex flex-col gap-1">
      <span className="text-sm text-neutral-900">
        {field.label}
        {requiredMark}
      </span>
      <input
        type={field.fieldKey === "email" ? "email" : "text"}
        value={(value as string) ?? ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={getFieldPlaceholder(field)}
        className={INPUT_CLASS}
      />
    </label>
  );
}
