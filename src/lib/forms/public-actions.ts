"use server";

import { submitFormSubmission } from "./submit-form";

export type SubmitPublicFormResult = { success: true } | { success: false; error: string };

/**
 * 公開問い合わせフォーム(/contact/[number]、public-contact-form.tsx)からの送信を
 * 受け付けるServer Action。確認画面(入力→確認→送信の2段階)を挟むため、
 * クライアント側でReact stateとして保持した回答一式(payload)をそのまま受け取る形にしている
 * (外部ドメイン向けのWebhook(/api/webhooks/form)と違い、Server Actionはブラウザから
 * 直接HTTPで叩ける汎用エンドポイントではないため共有シークレットは不要)。
 */
export async function submitPublicForm(
  formId: string,
  payload: Record<string, unknown>
): Promise<SubmitPublicFormResult> {
  const result = await submitFormSubmission(formId, payload);
  if (!result.ok) {
    // 入力内容の不備(400)はそのまま案内する。それ以外(フォーム未検出・DBエラー等)は
    // 内部情報を外部に漏らさないよう汎用メッセージに置き換える。
    // 入力内容の不備(400)はそのまま案内する。それ以外(フォーム未検出・DBエラー等)は
    // 内部情報を外部に漏らさないよう汎用メッセージに置き換える。
    const message =
      result.status === 400 ? result.error : "送信に失敗しました。時間をおいて再度お試しください。";
    return { success: false, error: message };
  }
  return { success: true };
}
