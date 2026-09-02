import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { isScheduleDueNow } from "@/lib/reports/is-schedule-due";
import { runDueReportSchedule } from "@/lib/reports/run-report";
import { verifySharedSecret } from "@/lib/webhooks/verify-signature";
import type { ReportMetricKey } from "@/lib/reports/metrics";

/**
 * レポート定期実行(SCREEN_SPEC.md 8章、TECH_STACK.md)。
 * Vercel Cronから1時間ごとに呼ばれる想定(vercel.jsonでスケジュール設定が必要)。
 * 認証はVercel Cronの標準方式(Authorization: Bearer {CRON_SECRET})。
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  const provided = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!secret || !verifySharedSecret(secret, provided)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const admin = createSupabaseAdminClient();
  const { data: schedules, error } = await admin
    .from("report_schedules")
    .select("id, report_id, frequency, day_of_week, day_of_month, time_of_day, slack_channel_id, message_template, report:reports(name, metrics)")
    .eq("is_active", true);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const now = new Date();
  let ranCount = 0;

  for (const schedule of schedules ?? []) {
    const due = isScheduleDueNow(
      {
        frequency: schedule.frequency,
        dayOfWeek: schedule.day_of_week,
        dayOfMonth: schedule.day_of_month,
        timeOfDay: schedule.time_of_day,
      },
      now
    );
    if (!due || !schedule.report) continue;

    await runDueReportSchedule(
      {
        scheduleId: schedule.id,
        reportId: schedule.report_id,
        reportName: schedule.report.name,
        metrics: (schedule.report.metrics as ReportMetricKey[]) ?? [],
        frequency: schedule.frequency,
        slackChannelId: schedule.slack_channel_id,
        messageTemplate: schedule.message_template,
      },
      now
    );
    ranCount++;
  }

  return NextResponse.json({ checked: schedules?.length ?? 0, ran: ranCount });
}
