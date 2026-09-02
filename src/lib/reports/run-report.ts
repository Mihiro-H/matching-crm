import "server-only";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { sendSlackMessage } from "@/lib/slack/send-message";
import { renderMessageTemplate } from "@/lib/slack/template";
import type { ReportFrequency } from "@/lib/supabase/database.types";
import type { ReportMetricKey } from "./metrics";
import { computeReportMetrics } from "./compute-metrics";
import { computeReportPeriod, formatReportPeriodLabel } from "./report-period";

export type DueSchedule = {
  scheduleId: string;
  reportId: string;
  reportName: string;
  metrics: ReportMetricKey[];
  frequency: ReportFrequency;
  slackChannelId: string;
  messageTemplate: string;
};

/**
 * 定期実行1件分を処理する(SCREEN_SPEC.md 8章)。
 * 集計 → report_runsへスナップショット保存 → Slack通知、の順で行う。
 * 集計自体が失敗した場合もreport_runsにfailedとして記録し、通知は送らない。
 */
export async function runDueReportSchedule(schedule: DueSchedule, now: Date): Promise<void> {
  const admin = createSupabaseAdminClient();
  const period = computeReportPeriod(schedule.frequency, now);

  try {
    const snapshot = await computeReportMetrics(schedule.metrics, period);

    await admin.from("report_runs").insert({
      report_id: schedule.reportId,
      schedule_id: schedule.scheduleId,
      generated_at: now.toISOString(),
      result_snapshot: snapshot,
      status: "success",
    });

    const text = renderMessageTemplate(schedule.messageTemplate, {
      report_name: schedule.reportName,
      period: formatReportPeriodLabel(period),
    });
    await sendSlackMessage(schedule.slackChannelId, text);
  } catch (err) {
    await admin.from("report_runs").insert({
      report_id: schedule.reportId,
      schedule_id: schedule.scheduleId,
      generated_at: now.toISOString(),
      result_snapshot: {},
      status: "failed",
      error_message: err instanceof Error ? err.message : "レポート集計に失敗しました。",
    });
  }
}
