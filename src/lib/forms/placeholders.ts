import type { BuiltinFieldKey } from "./builtin-fields";
import type { FormFieldRow } from "./types";

/**
 * 公開フォーム(SCREEN_SPEC.md「フォーム管理」)のデフォルトプレースホルダー。
 * ビルトイン項目は分かりやすい入力例を、カスタム項目は回答方式に応じた汎用文言を表示する
 * (label自体は管理画面で自由に編集できるため、プレースホルダーは項目名に依存させず
 * fieldKey/answerTypeだけから機械的に決める)。
 */
const BUILTIN_PLACEHOLDERS: Partial<Record<BuiltinFieldKey, string>> = {
  name: "例: 山田 太郎",
  email: "例: example@mail.co.jp",
  phone: "例: 090-1234-5678",
  company_name: "例: 株式会社〇〇",
  inquiry_body: "お問い合わせ内容をご記入ください",
};

const GENERIC_PLACEHOLDER_BY_ANSWER_TYPE: Partial<Record<FormFieldRow["answerType"], string>> = {
  text: "回答を入力してください",
  textarea: "回答をご記入ください",
};

/** text/textarea以外(select系)はネイティブのプレースホルダーが意味を持たないためundefined。 */
export function getFieldPlaceholder(field: FormFieldRow): string | undefined {
  if (field.answerType !== "text" && field.answerType !== "textarea") return undefined;

  if (field.isBuiltin) {
    return BUILTIN_PLACEHOLDERS[field.fieldKey as BuiltinFieldKey] ?? GENERIC_PLACEHOLDER_BY_ANSWER_TYPE[field.answerType];
  }

  return GENERIC_PLACEHOLDER_BY_ANSWER_TYPE[field.answerType];
}
