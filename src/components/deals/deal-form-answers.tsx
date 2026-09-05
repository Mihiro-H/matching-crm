import type { DealFormAnswer } from "@/lib/deals/get-deal";

function formatValue(value: DealFormAnswer["value"]): string {
  if (value === null || value === undefined) return "-";
  if (Array.isArray(value)) return value.length > 0 ? value.map(String).join(" / ") : "-";
  return String(value);
}

/**
 * 商談詳細「フォームの回答内容」(SCREEN_SPEC.md「商談管理」)。
 * 基本情報で既に表示済みの項目(氏名/メール/依頼職種/問い合わせ内容等)は含まず、
 * フォーム側で追加されたカスタム項目の回答のみを、その問い合わせ時点の
 * フォーム構成(項目名・並び順)に合わせて表示する。
 */
export function DealFormAnswers({ answers }: { answers: DealFormAnswer[] }) {
  if (answers.length === 0) return null;

  return (
    <div className="rounded-lg border border-neutral-200 bg-neutral-0 p-6">
      <h3 className="text-md text-neutral-900">フォームの回答内容</h3>
      <dl className="mt-3 grid grid-cols-2 gap-4 text-sm">
        {answers.map((answer, i) => (
          <div key={i}>
            <dt className="text-xs text-neutral-600">{answer.label}</dt>
            <dd className="mt-1 whitespace-pre-wrap text-neutral-900">{formatValue(answer.value)}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
