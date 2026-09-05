import Papa from "papaparse";
import { PROJECT_STATUS_META } from "@/lib/status-badges";
import type { Json, ProjectStatus } from "@/lib/supabase/database.types";
import type { ReportMetricKey } from "./metrics";

export type ReportExportMetric = { key: ReportMetricKey; label: string; value: Json };

export type ReportExportInput = {
  reportName: string;
  periodLabel: string;
  generatedAtLabel: string;
  metrics: ReportExportMetric[];
};

function statusLabel(status: string): string {
  return PROJECT_STATUS_META[status as ProjectStatus]?.label ?? status;
}

/**
 * 1つの集計項目の値(computeReportMetrics参照)を「行の配列」に変換する。
 * 項目ごとに値の形が決まっているため、metric.keyで振り分ける
 * (JSON値の形からの推測(duck typing)はしない)。
 */
function metricValueToRows(key: ReportMetricKey, value: Json): string[][] {
  switch (key) {
    case "new_contacts_count":
    case "unpaid_invoice_total":
      return [[String(value)]];

    case "won_count_and_revenue": {
      const v = value as { count: number; revenue: number };
      return [
        ["受注数", String(v.count)],
        ["受注額", String(v.revenue)],
      ];
    }

    case "project_status_breakdown": {
      const v = value as Record<string, number>;
      return [["ステータス", "件数"], ...Object.entries(v).map(([status, count]) => [statusLabel(status), String(count)])];
    }

    case "assignee_performance": {
      const v = value as { userName: string; wonContactsCount: number; revenue: number }[];
      return [
        ["担当者名", "受注件数", "売上"],
        ...v.map((row) => [row.userName, String(row.wonContactsCount), String(row.revenue)]),
      ];
    }

    case "company_revenue_ranking": {
      const v = value as { companyName: string; revenue: number }[];
      return [["企業名", "売上"], ...v.map((row) => [row.companyName, String(row.revenue)])];
    }
  }
}

/**
 * ダウンロード(CSV)。SCREEN_SPEC.md 8章「レポート表示画面」。
 * PDFはブラウザの印刷機能(/reports/[id]/print)で代替するため、ここではCSVのみ生成する
 * (jsPDF等でPDFを自前生成する場合、日本語フォントを別途埋め込まないと文字化けするため)。
 */
export function buildReportCsv(input: ReportExportInput): string {
  const rows: string[][] = [
    [input.reportName],
    [`対象期間: ${input.periodLabel}`],
    [`最終生成日時: ${input.generatedAtLabel}`],
  ];

  for (const metric of input.metrics) {
    rows.push([], [metric.label], ...metricValueToRows(metric.key, metric.value));
  }

  return Papa.unparse(rows);
}
