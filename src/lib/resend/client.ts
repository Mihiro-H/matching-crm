const RESEND_BASE = "https://api.resend.com";

export type SendEmailResult = { ok: true; id: string } | { ok: false; error: string };

/**
 * Resend(https://resend.com/docs/api-reference/emails/send-email)クライアント。
 * フォームの自動返信メール(submit-form.ts)専用。プレーンテキストのみ送信する
 * (HTMLメール・添付ファイルは現状不要なため未対応)。
 */
export async function sendEmail(
  apiKey: string,
  params: { from: string; to: string; subject: string; text: string },
  fetchImpl: typeof fetch = fetch
): Promise<SendEmailResult> {
  const response = await fetchImpl(`${RESEND_BASE}/emails`, {
    method: "POST",
    headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
    body: JSON.stringify({
      from: params.from,
      to: [params.to],
      subject: params.subject,
      text: params.text,
    }),
  });

  if (!response.ok) {
    // Resendのエラーレスポンスは{"message": "詳細メッセージ"}形式で具体的な原因を返してくる
    // ことが多いため、原因調査しやすいようできる限り本文も含める(fromの未検証ドメイン等、
    // ステータスコードだけでは分からない不具合の切り分けに必要)。
    const detail = await response
      .json()
      .then((body: { message?: string }) => body.message)
      .catch(() => undefined);
    const suffix = detail ? `(${response.status}: ${detail})` : `(${response.status})`;
    return { ok: false, error: `メール送信に失敗しました${suffix}` };
  }
  const json = (await response.json()) as { id?: string };
  if (!json.id) return { ok: false, error: "メール送信に失敗しました(idが空です)" };
  return { ok: true, id: json.id };
}
