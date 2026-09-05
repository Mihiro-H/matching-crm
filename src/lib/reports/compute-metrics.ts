import "server-only";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/lib/supabase/database.types";
import type { ReportMetricKey } from "./metrics";
import type { ReportPeriod } from "./report-period";

type SupabaseAdmin = ReturnType<typeof createSupabaseAdminClient>;

async function computeNewContactsCount(admin: SupabaseAdmin, period: ReportPeriod): Promise<number> {
  const { count } = await admin
    .from("deals")
    .select("id", { count: "exact", head: true })
    .gte("created_at", period.startIso)
    .lt("created_at", period.endIso);
  return count ?? 0;
}

async function computeWonCountAndRevenue(
  admin: SupabaseAdmin,
  period: ReportPeriod
): Promise<{ count: number; revenue: number }> {
  const { count } = await admin
    .from("deals")
    .select("id", { count: "exact", head: true })
    .eq("status", "won")
    .gte("won_at", period.startIso)
    .lt("won_at", period.endIso);

  const { data: estimates } = await admin
    .from("estimates")
    .select("amount")
    .eq("contract_status", "signed")
    .gte("signed_at", period.startIso)
    .lt("signed_at", period.endIso);

  const revenue = (estimates ?? []).reduce((sum, row) => sum + row.amount, 0);
  return { count: count ?? 0, revenue };
}

async function computeUnpaidInvoiceTotal(admin: SupabaseAdmin): Promise<number> {
  const { data } = await admin.from("invoices").select("amount").eq("payment_status", "unpaid");
  return (data ?? []).reduce((sum, row) => sum + row.amount, 0);
}

async function computeProjectStatusBreakdown(admin: SupabaseAdmin): Promise<Record<string, number>> {
  const { data } = await admin.from("projects").select("status");
  const breakdown: Record<string, number> = {};
  for (const row of data ?? []) {
    breakdown[row.status] = (breakdown[row.status] ?? 0) + 1;
  }
  return breakdown;
}

async function computeAssigneePerformance(
  admin: SupabaseAdmin,
  period: ReportPeriod
): Promise<{ userId: string; userName: string; wonContactsCount: number; revenue: number }[]> {
  const { data: wonContacts } = await admin
    .from("deals")
    .select("assigned_user_id")
    .eq("status", "won")
    .gte("won_at", period.startIso)
    .lt("won_at", period.endIso)
    .not("assigned_user_id", "is", null);

  const { data: signedEstimates } = await admin
    .from("estimates")
    .select("amount, project:projects(project_assignees(user_id, role))")
    .eq("contract_status", "signed")
    .gte("signed_at", period.startIso)
    .lt("signed_at", period.endIso);

  const wonCountByUser = new Map<string, number>();
  for (const row of wonContacts ?? []) {
    if (!row.assigned_user_id) continue;
    wonCountByUser.set(row.assigned_user_id, (wonCountByUser.get(row.assigned_user_id) ?? 0) + 1);
  }

  const revenueByUser = new Map<string, number>();
  for (const row of signedEstimates ?? []) {
    const primary = row.project?.project_assignees?.find((a) => a.role === "primary");
    if (!primary) continue;
    revenueByUser.set(primary.user_id, (revenueByUser.get(primary.user_id) ?? 0) + row.amount);
  }

  const userIds = new Set([...wonCountByUser.keys(), ...revenueByUser.keys()]);
  if (userIds.size === 0) return [];

  const { data: users } = await admin.from("users").select("id, name").in("id", Array.from(userIds));
  const nameById = new Map((users ?? []).map((u) => [u.id, u.name]));

  return Array.from(userIds).map((userId) => ({
    userId,
    userName: nameById.get(userId) ?? "(不明)",
    wonContactsCount: wonCountByUser.get(userId) ?? 0,
    revenue: revenueByUser.get(userId) ?? 0,
  }));
}

async function computeCompanyRevenueRanking(
  admin: SupabaseAdmin,
  period: ReportPeriod
): Promise<{ companyId: string; companyName: string; revenue: number }[]> {
  const { data } = await admin
    .from("estimates")
    .select("amount, project:projects(company_id, company:companies(name))")
    .eq("contract_status", "signed")
    .gte("signed_at", period.startIso)
    .lt("signed_at", period.endIso);

  const revenueByCompany = new Map<string, { name: string; revenue: number }>();
  for (const row of data ?? []) {
    const companyId = row.project?.company_id;
    if (!companyId) continue;
    const existing = revenueByCompany.get(companyId);
    const revenue = (existing?.revenue ?? 0) + row.amount;
    revenueByCompany.set(companyId, { name: row.project?.company?.name ?? "(不明)", revenue });
  }

  return Array.from(revenueByCompany.entries())
    .map(([companyId, { name, revenue }]) => ({ companyId, companyName: name, revenue }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);
}

/**
 * reports.metrics(DB_SCHEMA.md、確定済み6項目)の集計値を計算する。
 * point-in-time系(未回収請求額・案件ステータス内訳)は期間に関わらず現時点の
 * スナップショット、期間集計系はcomputeReportPeriodの期間で絞り込む。
 */
export async function computeReportMetrics(
  metricKeys: ReportMetricKey[],
  period: ReportPeriod
): Promise<Record<string, Json>> {
  const admin = createSupabaseAdminClient();
  const result: Record<string, Json> = {};

  for (const key of metricKeys) {
    switch (key) {
      case "new_contacts_count":
        result[key] = await computeNewContactsCount(admin, period);
        break;
      case "won_count_and_revenue":
        result[key] = await computeWonCountAndRevenue(admin, period);
        break;
      case "unpaid_invoice_total":
        result[key] = await computeUnpaidInvoiceTotal(admin);
        break;
      case "project_status_breakdown":
        result[key] = await computeProjectStatusBreakdown(admin);
        break;
      case "assignee_performance":
        result[key] = await computeAssigneePerformance(admin, period);
        break;
      case "company_revenue_ranking":
        result[key] = await computeCompanyRevenueRanking(admin, period);
        break;
    }
  }

  return result;
}
