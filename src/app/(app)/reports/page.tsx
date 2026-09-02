import Link from "next/link";
import { getReports } from "@/lib/reports/get-reports";
import { isSupabaseConfigured } from "@/lib/supabase/server";

const FREQUENCY_LABELS = { weekly: "週次", monthly: "月次" } as const;
const RUN_STATUS_LABELS = { success: "成功", failed: "失敗" } as const;

export default async function ReportsPage() {
  if (!isSupabaseConfigured()) {
    return <SupabaseNotConfiguredNotice />;
  }

  const { reports, error } = await getReports();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Link href="/reports/new" className="rounded-md bg-primary-500 px-4 py-2 text-sm text-neutral-0">
          +レポートを作成
        </Link>
      </div>

      {error && (
        <div className="rounded-lg border border-danger-bg bg-danger-bg p-4 text-sm text-danger-text">
          一覧の取得に失敗しました: {error}
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-neutral-0">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-neutral-100 text-neutral-600">
              <th className="px-4 py-3 font-medium">レポート名</th>
              <th className="px-4 py-3 font-medium">頻度</th>
              <th className="px-4 py-3 font-medium">次回実行日時</th>
              <th className="px-4 py-3 font-medium">最終実行結果</th>
            </tr>
          </thead>
          <tbody>
            {reports.map((report) => (
              <tr key={report.id} className="border-b border-neutral-100 last:border-0">
                <td className="px-4 py-3">
                  <Link href={`/reports/${report.id}`} className="text-primary-600 hover:underline">
                    {report.name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-neutral-600">
                  {report.frequency ? FREQUENCY_LABELS[report.frequency] : "-"}
                </td>
                <td className="px-4 py-3 text-neutral-600">
                  {report.nextRunAt ? new Date(report.nextRunAt).toLocaleString("ja-JP") : "-"}
                </td>
                <td className="px-4 py-3 text-neutral-600">
                  {report.lastRunStatus ? RUN_STATUS_LABELS[report.lastRunStatus] : "未実行"}
                </td>
              </tr>
            ))}
            {reports.length === 0 && !error && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-neutral-600">
                  レポートはまだありません。
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SupabaseNotConfiguredNotice() {
  return (
    <div className="rounded-lg border border-neutral-200 bg-neutral-0 p-8">
      <h2 className="text-lg text-neutral-900">Supabase未接続です</h2>
      <p className="mt-2 text-sm text-neutral-600">
        Supabaseの接続情報を .env に設定すると、一覧が表示されます。
      </p>
    </div>
  );
}
