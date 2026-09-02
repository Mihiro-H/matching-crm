// ダッシュボード画面(SCREEN_SPEC.md 1章)のサマリーカード・
// 「今日やること」リストを組み立てる純粋関数群。
// Supabaseへの問い合わせ自体は get-dashboard-data.ts (I/O層) が担当する。

export function sumAmounts(rows: { amount: number | null }[]): number {
  return rows.reduce((total, row) => total + (row.amount ?? 0), 0);
}

/**
 * 指定した日時が属する月の、UTC基準での開始(含む)・終了(含まない)ISO文字列を返す。
 *
 * 注意: 「今月」の判定はUTCの暦月で行っている。JST(UTC+9)基準の暦月と
 * 完全には一致しない(日本時間の月初1〜9時台がUTC上は前月扱いになる)ため、
 * 本番運用でJST基準の厳密な月次集計が必要になった場合は要調整。
 */
export function getMonthRange(reference: Date): { startIso: string; endIso: string } {
  const year = reference.getUTCFullYear();
  const month = reference.getUTCMonth();

  const start = new Date(Date.UTC(year, month, 1));
  const end = new Date(Date.UTC(year, month + 1, 1));

  return { startIso: start.toISOString(), endIso: end.toISOString() };
}

export type PendingEstimate = {
  id: string;
  amount: number;
  sentAt: string;
  projectTitle: string;
  companyName: string;
};

export type PendingInvoice = {
  id: string;
  amount: number;
  dueDate: string;
  projectTitle: string;
  companyName: string;
};

export type TodoItem = {
  id: string;
  type: "estimate_awaiting_signature" | "invoice_awaiting_payment";
  label: string;
  amount: number;
  date: string;
  href: string;
};

/**
 * 契約締結待ちの見積・入金確認待ちの請求を1つのリストにまとめ、新しい順に並べる。
 * (SCREEN_SPEC.md「今日やること」リスト。「次回提案リマインド」はDB_SCHEMA.mdに
 * 対応するデータソースがなく未実装 — 別途仕様確認が必要)
 */
export function buildTodoItems({
  pendingEstimates,
  pendingInvoices,
}: {
  pendingEstimates: PendingEstimate[];
  pendingInvoices: PendingInvoice[];
}): TodoItem[] {
  const estimateItems: TodoItem[] = pendingEstimates.map((estimate) => ({
    id: estimate.id,
    type: "estimate_awaiting_signature",
    label: `${estimate.companyName} / ${estimate.projectTitle}`,
    amount: estimate.amount,
    date: estimate.sentAt,
    href: "/estimates",
  }));

  const invoiceItems: TodoItem[] = pendingInvoices.map((invoice) => ({
    id: invoice.id,
    type: "invoice_awaiting_payment",
    label: `${invoice.companyName} / ${invoice.projectTitle}`,
    amount: invoice.amount,
    date: invoice.dueDate,
    href: "/invoices",
  }));

  return [...estimateItems, ...invoiceItems].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
}
