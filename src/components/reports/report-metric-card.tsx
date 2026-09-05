import { PROJECT_STATUS_META } from "@/lib/status-badges";
import { formatCurrencyJPY } from "@/lib/format";
import type { Json, ProjectStatus } from "@/lib/supabase/database.types";
import type { ReportMetricKey } from "@/lib/reports/metrics";

function statusLabel(status: string): string {
  return PROJECT_STATUS_META[status as ProjectStatus]?.label ?? status;
}

/**
 * レポート表示画面(SCREEN_SPEC.md 8章)の本体。選択済みmetricsをそれぞれ
 * カード/表として表示する。値の形は集計項目ごとに決まっているため、
 * metricKeyで振り分ける(export.tsのmetricValueToRowsと対になる表示側の実装)。
 */
export function ReportMetricCard({
  metricKey,
  label,
  value,
}: {
  metricKey: ReportMetricKey;
  label: string;
  value: Json;
}) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-neutral-0 p-6">
      <h3 className="text-md text-neutral-900">{label}</h3>
      <div className="mt-3">{renderMetricBody(metricKey, value)}</div>
    </div>
  );
}

function renderMetricBody(metricKey: ReportMetricKey, value: Json) {
  switch (metricKey) {
    case "new_contacts_count":
      return <StatValue value={`${value as number}件`} />;

    case "unpaid_invoice_total":
      return <StatValue value={formatCurrencyJPY(value as number)} />;

    case "won_count_and_revenue": {
      const v = value as { count: number; revenue: number };
      return (
        <div className="flex gap-8">
          <StatValue label="受注数" value={`${v.count}件`} />
          <StatValue label="受注額" value={formatCurrencyJPY(v.revenue)} />
        </div>
      );
    }

    case "project_status_breakdown": {
      const v = value as Record<string, number>;
      const entries = Object.entries(v);
      if (entries.length === 0) return <EmptyRow />;
      return (
        <table className="w-full text-left text-sm">
          <tbody>
            {entries.map(([status, count]) => (
              <tr key={status} className="border-b border-neutral-100 last:border-0">
                <td className="py-1.5 text-neutral-600">{statusLabel(status)}</td>
                <td className="py-1.5 text-right text-neutral-900">{count}件</td>
              </tr>
            ))}
          </tbody>
        </table>
      );
    }

    case "assignee_performance": {
      const v = value as { userId: string; userName: string; wonContactsCount: number; revenue: number }[];
      if (v.length === 0) return <EmptyRow />;
      return (
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-neutral-100 text-neutral-600">
              <th className="py-1.5 font-medium">担当者名</th>
              <th className="py-1.5 font-medium text-right">受注件数</th>
              <th className="py-1.5 font-medium text-right">売上</th>
            </tr>
          </thead>
          <tbody>
            {v.map((row) => (
              <tr key={row.userId} className="border-b border-neutral-100 last:border-0">
                <td className="py-1.5 text-neutral-900">{row.userName}</td>
                <td className="py-1.5 text-right text-neutral-600">{row.wonContactsCount}件</td>
                <td className="py-1.5 text-right text-neutral-600">{formatCurrencyJPY(row.revenue)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      );
    }

    case "company_revenue_ranking": {
      const v = value as { companyId: string; companyName: string; revenue: number }[];
      if (v.length === 0) return <EmptyRow />;
      return (
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-neutral-100 text-neutral-600">
              <th className="py-1.5 font-medium">順位</th>
              <th className="py-1.5 font-medium">企業名</th>
              <th className="py-1.5 font-medium text-right">売上</th>
            </tr>
          </thead>
          <tbody>
            {v.map((row, i) => (
              <tr key={row.companyId} className="border-b border-neutral-100 last:border-0">
                <td className="py-1.5 text-neutral-600">{i + 1}</td>
                <td className="py-1.5 text-neutral-900">{row.companyName}</td>
                <td className="py-1.5 text-right text-neutral-600">{formatCurrencyJPY(row.revenue)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      );
    }
  }
}

function StatValue({ label, value }: { label?: string; value: string }) {
  return (
    <div>
      {label && <p className="text-xs text-neutral-600">{label}</p>}
      <p className="text-lg text-neutral-900">{value}</p>
    </div>
  );
}

function EmptyRow() {
  return <p className="text-sm text-neutral-600">データがありません。</p>;
}
