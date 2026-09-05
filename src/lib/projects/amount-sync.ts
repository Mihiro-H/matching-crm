/**
 * 見積書・納品書・請求書作成画面での金額修正判定。
 * 案件のbudgetから自動反映された金額をユーザーが変更した場合のみ、
 * 「案件ページの金額も変更しますか?」の確認ポップアップを出す対象とする。
 */
export function amountDiffersFromBudget(amount: number, originalBudget: number | null): boolean {
  if (originalBudget === null) return amount > 0;
  return amount !== originalBudget;
}
