import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ReportFrequency } from "@/lib/supabase/database.types";
import { computeNextRunAt } from "./next-run";
import { rangeForPage } from "@/lib/pagination";

export type ReportListRow = {
  id: string;
  name: string;
  frequency: ReportFrequency | null;
  nextRunAt: string | null;
  lastRunAt: string | null;
};

/**
 * レポート一覧(SCREEN_SPEC.md 8章)。
 * 1レポートに複数スケジュールを持たせることもDB上は可能だが(reports 1--N
 * report_schedules)、作成画面は1レポートにつき1スケジューリングのみを
 * 前提としたUIのため、表示上は最初の1件のみを使う。
 */
export async function getReports(
  page: number
): Promise<{ reports: ReportListRow[]; totalCount: number; error: string | null }> {
  const supabase = await createSupabaseServerClient();
  const { data, error, count } = await supabase
    .from("reports")
    .select(
      "id, name, report_schedules(frequency, day_of_week, day_of_month, time_of_day, is_active), report_runs(generated_at)",
      { count: "exact" }
    )
    .order("created_at", { ascending: false })
    .range(...rangeForPage(page));

  if (error) {
    return { reports: [], totalCount: 0, error: error.message };
  }

  const now = new Date();

  return {
    reports: (data ?? []).map((row) => {
      const schedule = row.report_schedules?.[0] ?? null;
      const nextRunAt =
        schedule && schedule.is_active
          ? computeNextRunAt(
              {
                frequency: schedule.frequency,
                dayOfWeek: schedule.day_of_week,
                dayOfMonth: schedule.day_of_month,
                timeOfDay: schedule.time_of_day,
              },
              now
            ).toISOString()
          : null;

      const lastRun = [...(row.report_runs ?? [])].sort(
        (a, b) => new Date(b.generated_at).getTime() - new Date(a.generated_at).getTime()
      )[0];

      return {
        id: row.id,
        name: row.name,
        frequency: schedule?.frequency ?? null,
        nextRunAt,
        lastRunAt: lastRun?.generated_at ?? null,
      };
    }),
    totalCount: count ?? 0,
    error: null,
  };
}
