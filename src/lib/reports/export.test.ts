import { describe, expect, test } from "vitest";
import { buildReportCsv, type ReportExportInput } from "./export";

const baseInput: ReportExportInput = {
  reportName: "月次営業レポート",
  periodLabel: "2026年8月",
  generatedAtLabel: "2026/09/01 09:00",
  metrics: [
    { key: "new_contacts_count", label: "新規問い合わせ数", value: 12 },
    { key: "won_count_and_revenue", label: "受注数・受注額", value: { count: 3, revenue: 900000 } },
    { key: "unpaid_invoice_total", label: "未回収請求額", value: 150000 },
    {
      key: "project_status_breakdown",
      label: "案件ステータス内訳",
      value: { negotiating: 2, in_progress: 5 },
    },
    {
      key: "assignee_performance",
      label: "担当者別成績",
      value: [{ userId: "u1", userName: "田中太郎", wonContactsCount: 2, revenue: 500000 }],
    },
    {
      key: "company_revenue_ranking",
      label: "企業別売上ランキング",
      value: [{ companyId: "c1", companyName: "テスト株式会社", revenue: 500000 }],
    },
  ],
};

describe("buildReportCsv", () => {
  test("includes the report header (name, period, generated at)", () => {
    const csv = buildReportCsv(baseInput);
    expect(csv).toContain("月次営業レポート");
    expect(csv).toContain("2026年8月");
    expect(csv).toContain("2026/09/01 09:00");
  });

  test("renders a scalar metric as a single value row", () => {
    const csv = buildReportCsv(baseInput);
    expect(csv).toContain("新規問い合わせ数");
    expect(csv).toContain("12");
  });

  test("renders the won count/revenue metric as labeled sub-rows", () => {
    const csv = buildReportCsv(baseInput);
    expect(csv).toContain("受注数");
    expect(csv).toContain("3");
    expect(csv).toContain("受注額");
    expect(csv).toContain("900000");
  });

  test("renders the project status breakdown with Japanese status labels", () => {
    const csv = buildReportCsv(baseInput);
    expect(csv).toContain("商談中");
    expect(csv).toContain("進行中");
  });

  test("renders the assignee performance table with a header row", () => {
    const csv = buildReportCsv(baseInput);
    expect(csv).toContain("担当者名");
    expect(csv).toContain("田中太郎");
    expect(csv).toContain("500000");
  });

  test("renders the company revenue ranking table with a header row", () => {
    const csv = buildReportCsv(baseInput);
    expect(csv).toContain("企業名");
    expect(csv).toContain("テスト株式会社");
  });

  test("returns an empty-metrics-safe csv when there are no metrics", () => {
    const csv = buildReportCsv({ ...baseInput, metrics: [] });
    expect(csv).toContain("月次営業レポート");
  });
});
