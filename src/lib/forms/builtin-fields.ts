import { JOB_CATEGORIES, JOB_CATEGORY_LABELS } from "@/lib/job-categories";
import type { FormAnswerType } from "@/lib/supabase/database.types";

/**
 * 問い合わせフォームの項目のうち、contactsの実カラムに対応する「ビルトイン項目」の
 * カタログ(SCREEN_SPEC.md「フォーム管理」)。回答方式・選択肢はカラムの型に
 * 従って固定とし、新規追加できるのはこれ以外の「カスタム項目」のみとする
 * (custom_fields(jsonb)に保存、parse-submission.ts参照)。
 */
export type BuiltinFieldKey =
  | "name"
  | "email"
  | "phone"
  | "company_name"
  | "job_categories"
  | "inquiry_body"
  | "privacy_consent";

/**
 * 個人情報の取扱いに関する同意チェックボックスの固定文言(公開フォームでのみ表示)。
 * 法務文言のため、フォームごとに編集できないよう定数として持つ
 * (public-contact-form.tsxがこの定数を直接参照する)。
 */
export const PRIVACY_CONSENT_NOTICE =
  "お客様の個人情報は、当社の個人情報保護方針に基づきましてお取り扱いさせていただきます。\n" +
  "ご同意いただけます場合には下のボタンをクリックして、次の項目にお進みください。";
export const PRIVACY_CONSENT_OPTION_VALUE = "agreed";
export const PRIVACY_CONSENT_CHECKBOX_LABEL = "✅個人情報の取扱いについて同意する";

export type BuiltinFieldDef = {
  key: BuiltinFieldKey;
  defaultLabel: string;
  answerType: FormAnswerType;
  options: { value: string; label: string }[] | null;
  /** falseの場合、フォームから外せない(氏名は問い合わせ受付の必須項目のため) */
  removable: boolean;
};

export const BUILTIN_FIELDS: BuiltinFieldDef[] = [
  { key: "name", defaultLabel: "氏名", answerType: "text", options: null, removable: false },
  { key: "email", defaultLabel: "メールアドレス", answerType: "text", options: null, removable: true },
  { key: "phone", defaultLabel: "電話番号", answerType: "text", options: null, removable: true },
  { key: "company_name", defaultLabel: "企業名", answerType: "text", options: null, removable: true },
  {
    key: "job_categories",
    defaultLabel: "依頼職種",
    answerType: "multi_select",
    options: JOB_CATEGORIES.map((category) => ({ value: category, label: JOB_CATEGORY_LABELS[category] })),
    removable: true,
  },
  { key: "inquiry_body", defaultLabel: "問い合わせ内容", answerType: "textarea", options: null, removable: true },
  {
    key: "privacy_consent",
    defaultLabel: "個人情報の取扱いについての同意",
    answerType: "single_select",
    options: [{ value: PRIVACY_CONSENT_OPTION_VALUE, label: PRIVACY_CONSENT_CHECKBOX_LABEL }],
    // 個人情報保護方針への同意は問い合わせ受付の必須項目のため、氏名と同様に外せない
    // (公開フォームでは常に最後の項目として表示する、public-contact-form.tsx参照)。
    removable: false,
  },
];

export function isBuiltinFieldKey(key: string): key is BuiltinFieldKey {
  return BUILTIN_FIELDS.some((field) => field.key === key);
}

export function getBuiltinFieldDef(key: string): BuiltinFieldDef | undefined {
  return BUILTIN_FIELDS.find((field) => field.key === key);
}
