/**
 * freee連携(TECH_STACK.md / SCREEN_SPEC.md 7章)は未実装(フェーズC予定)。
 * 実際に接続されるまでは「連携中」インジケーターを偽って表示しないよう、
 * 環境変数の有無で判定する。
 */
export function isFreeeConfigured(): boolean {
  return Boolean(process.env.FREEE_CLIENT_ID);
}

/**
 * freee側の請求書へのリンクを生成する(SCREEN_SPEC.md 7章)。
 * 実際のURLパターンはfreee連携実装時に確定させる必要があるため、
 * 現時点ではプレースホルダー(未接続なら常にnull)。
 */
export function buildFreeeInvoiceUrl(freeeInvoiceId: string | null): string | null {
  if (!freeeInvoiceId || !isFreeeConfigured()) return null;
  return `https://secure.freee.co.jp/invoices/${freeeInvoiceId}`;
}
