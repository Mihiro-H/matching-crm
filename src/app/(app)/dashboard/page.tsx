import { Building2, Inbox, TrendingUp, Wallet } from "lucide-react";
import { getDashboardData } from "@/lib/dashboard/get-dashboard-data";
import { formatCurrencyJPY } from "@/lib/format";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { SummaryCard } from "./summary-card";
import { TodoList } from "./todo-list";

// SCREEN_SPEC.md 1章: view/edit で見た目の差はほぼ無いページのため、
// 権限による表示分岐はここでは不要。
export default async function DashboardPage() {
  if (!isSupabaseConfigured()) {
    return <SupabaseNotConfiguredNotice />;
  }

  const { data, errors } = await getDashboardData();

  return (
    <div className="flex flex-col gap-6">
      {errors.length > 0 && (
        <div className="rounded-lg border border-danger-bg bg-danger-bg p-4 text-sm text-danger-text">
          <p className="font-medium">一部のデータを取得できませんでした</p>
          <ul className="mt-1 list-disc pl-5">
            {errors.map((message) => (
              <li key={message}>{message}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid grid-cols-4 gap-4">
        <SummaryCard label="未対応の問い合わせ" value={`${data.newContactsCount}件`} icon={Inbox} />
        <SummaryCard label="進行中案件数" value={`${data.activeProjectsCount}件`} icon={Building2} />
        <SummaryCard
          label="今月の受注額"
          value={formatCurrencyJPY(data.monthlyWonAmount)}
          icon={TrendingUp}
        />
        <SummaryCard
          label="未回収請求額"
          value={formatCurrencyJPY(data.unpaidInvoiceTotal)}
          icon={Wallet}
        />
      </div>

      <div className="rounded-lg border border-neutral-200 bg-neutral-0 p-6">
        <h2 className="text-lg text-neutral-900">今日やること</h2>
        <div className="mt-4">
          <TodoList items={data.todoItems} />
        </div>
      </div>
    </div>
  );
}

function SupabaseNotConfiguredNotice() {
  return (
    <div className="rounded-lg border border-neutral-200 bg-neutral-0 p-8">
      <h2 className="text-lg text-neutral-900">Supabase未接続です</h2>
      <p className="mt-2 text-sm text-neutral-600">
        <code className="rounded-sm bg-page-bg px-1 py-0.5 text-xs">
          NEXT_PUBLIC_SUPABASE_URL
        </code>{" "}
        /{" "}
        <code className="rounded-sm bg-page-bg px-1 py-0.5 text-xs">
          NEXT_PUBLIC_SUPABASE_ANON_KEY
        </code>{" "}
        を .env に設定すると、ここに実データが表示されます。
      </p>
    </div>
  );
}
