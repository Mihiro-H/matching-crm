import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";
import type { ReportMetricKey } from "./metrics";

export type ReportDetail = {
  id: string;
  name: string;
  metrics: ReportMetricKey[];
  schedule: Database["public"]["Tables"]["report_schedules"]["Row"] | null;
};

export async function getReportById(id: string): Promise<ReportDetail | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("reports")
    .select("id, name, metrics, report_schedules(*)")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(`レポートの取得に失敗しました: ${error.message}`);
  }
  if (!data) return null;

  return {
    id: data.id,
    name: data.name,
    metrics: Array.isArray(data.metrics) ? (data.metrics as ReportMetricKey[]) : [],
    schedule: data.report_schedules?.[0] ?? null,
  };
}

export type ReportRunRow = Database["public"]["Tables"]["report_runs"]["Row"];

/** 実行履歴タブ(SCREEN_SPEC.md 8章) */
export async function getReportRuns(reportId: string): Promise<{ runs: ReportRunRow[]; error: string | null }> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("report_runs")
    .select("*")
    .eq("report_id", reportId)
    .order("generated_at", { ascending: false });

  if (error) return { runs: [], error: error.message };
  return { runs: data ?? [], error: null };
}
