import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  buildTodoItems,
  getMonthRange,
  sumAmounts,
  type TodoItem,
} from "./dashboard-metrics";

export type DashboardData = {
  newContactsCount: number;
  activeProjectsCount: number;
  monthlyWonAmount: number;
  unpaidInvoiceTotal: number;
  todoItems: TodoItem[];
};

/**
 * ダッシュボードのサマリーカード・「今日やること」リストに必要なデータを取得する。
 * 各クエリは独立しているため、1つの失敗が他の集計を巻き込まないよう
 * Promise.allSettled で実行し、失敗したものは0件/0円として扱う
 * (エラー自体はコンソールに出さず、呼び出し元に集約して返す)。
 */
export async function getDashboardData(): Promise<{
  data: DashboardData;
  errors: string[];
}> {
  const supabase = await createSupabaseServerClient();
  const errors: string[] = [];
  const { startIso, endIso } = getMonthRange(new Date());

  const [
    newContactsResult,
    activeProjectsResult,
    monthlyWonEstimatesResult,
    unpaidInvoicesResult,
    pendingEstimatesResult,
    pendingInvoicesResult,
  ] = await Promise.allSettled([
    supabase.from("contacts").select("id", { count: "exact", head: true }).eq("status", "new"),
    supabase.from("projects").select("id", { count: "exact", head: true }).neq("status", "completed"),
    // 「今月の受注額」= 当月中に契約締結(signed)した見積の合計。
    // projects.status が contracted に遷移した日時を直接持つカラムはなく、
    // 契約締結はestimates.signedAtで捕捉できる(SCREEN_SPEC.md: signedになると
    // Webhook経由でproject.statusがcontractedへ自動遷移するため、実質同時)。
    supabase
      .from("estimates")
      .select("amount")
      .eq("contract_status", "signed")
      .gte("signed_at", startIso)
      .lt("signed_at", endIso),
    supabase.from("invoices").select("amount").eq("payment_status", "unpaid"),
    supabase
      .from("estimates")
      .select("id, amount, sent_at, project:projects(title, company:companies(name))")
      .eq("contract_status", "sent")
      .order("sent_at", { ascending: false })
      .limit(5),
    supabase
      .from("invoices")
      .select("id, amount, due_date, project:projects(title, company:companies(name))")
      .in("payment_status", ["invoiced", "unpaid"])
      .order("due_date", { ascending: true })
      .limit(5),
  ]);

  const newContactsCount = unwrapCount(newContactsResult, "未対応の問い合わせ数", errors);
  const activeProjectsCount = unwrapCount(activeProjectsResult, "進行中案件数", errors);

  const monthlyWonAmount = sumAmounts(
    unwrapRows<{ amount: number | null }>(monthlyWonEstimatesResult, "今月の受注額", errors)
  );

  const unpaidInvoiceTotal = sumAmounts(
    unwrapRows<{ amount: number | null }>(unpaidInvoicesResult, "未回収請求額", errors)
  );

  const pendingEstimates = unwrapRows<{
    id: string;
    amount: number;
    sent_at: string | null;
    project: { title: string; company: { name: string } | null } | null;
  }>(pendingEstimatesResult, "契約締結待ちの見積", errors)
    .filter((row) => row.sent_at !== null)
    .map((row) => ({
      id: row.id,
      amount: row.amount,
      sentAt: row.sent_at as string,
      projectTitle: row.project?.title ?? "(案件不明)",
      companyName: row.project?.company?.name ?? "(企業不明)",
    }));

  const pendingInvoices = unwrapRows<{
    id: string;
    amount: number;
    due_date: string | null;
    project: { title: string; company: { name: string } | null } | null;
  }>(pendingInvoicesResult, "入金確認待ちの請求", errors)
    .filter((row) => row.due_date !== null)
    .map((row) => ({
      id: row.id,
      amount: row.amount,
      dueDate: row.due_date as string,
      projectTitle: row.project?.title ?? "(案件不明)",
      companyName: row.project?.company?.name ?? "(企業不明)",
    }));

  const todoItems = buildTodoItems({ pendingEstimates, pendingInvoices });

  return {
    data: {
      newContactsCount,
      activeProjectsCount,
      monthlyWonAmount,
      unpaidInvoiceTotal,
      todoItems,
    },
    errors,
  };
}

function unwrapCount(
  result: PromiseSettledResult<{ count: number | null; error: { message: string } | null }>,
  label: string,
  errors: string[]
): number {
  if (result.status === "rejected") {
    errors.push(`${label}の取得に失敗しました: ${String(result.reason)}`);
    return 0;
  }
  if (result.value.error) {
    errors.push(`${label}の取得に失敗しました: ${result.value.error.message}`);
    return 0;
  }
  return result.value.count ?? 0;
}

function unwrapRows<T>(
  result: PromiseSettledResult<{ data: T[] | null; error: { message: string } | null }>,
  label: string,
  errors: string[]
): T[] {
  if (result.status === "rejected") {
    errors.push(`${label}の取得に失敗しました: ${String(result.reason)}`);
    return [];
  }
  if (result.value.error) {
    errors.push(`${label}の取得に失敗しました: ${result.value.error.message}`);
    return [];
  }
  return result.value.data ?? [];
}
