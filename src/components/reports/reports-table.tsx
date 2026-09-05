"use client";

import { useRouter } from "next/navigation";
import type { ReportListRow } from "@/lib/reports/get-reports";
import { formatDateTimeJa } from "@/lib/format";

const FREQUENCY_LABELS = { weekly: "週次", monthly: "月次" } as const;

/**
 * レポート一覧(SCREEN_SPEC.md 8章)。各行クリックでレポート表示画面(/reports/[id])へ
 * 遷移する(企業一覧等と違い、行内に複数のリンク先を持たないため行全体をリンクにする)。
 */
export function ReportsTable({ reports }: { reports: ReportListRow[] }) {
  const router = useRouter();

  return (
    <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-neutral-0">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-neutral-100 text-neutral-600">
            <th className="px-4 py-3 font-medium">レポート名</th>
            <th className="px-4 py-3 font-medium">頻度</th>
            <th className="px-4 py-3 font-medium">次回実行日時</th>
            <th className="px-4 py-3 font-medium">最終実行日時</th>
          </tr>
        </thead>
        <tbody>
          {reports.map((report) => (
            <tr
              key={report.id}
              tabIndex={0}
              role="link"
              onClick={() => router.push(`/reports/${report.id}`)}
              onKeyDown={(e) => {
                if (e.key === "Enter") router.push(`/reports/${report.id}`);
              }}
              className="cursor-pointer border-b border-neutral-100 last:border-0 hover:bg-page-bg"
            >
              <td className="px-4 py-3 text-primary-600">{report.name}</td>
              <td className="px-4 py-3 text-neutral-600">
                {report.frequency ? FREQUENCY_LABELS[report.frequency] : "-"}
              </td>
              <td className="px-4 py-3 text-neutral-600">
                {report.nextRunAt ? formatDateTimeJa(report.nextRunAt) : "-"}
              </td>
              <td className="px-4 py-3 text-neutral-600">
                {report.lastRunAt ? formatDateTimeJa(report.lastRunAt) : "未実行"}
              </td>
            </tr>
          ))}
          {reports.length === 0 && (
            <tr>
              <td colSpan={4} className="px-4 py-8 text-center text-neutral-600">
                レポートはまだありません。
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
