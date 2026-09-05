"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUserId } from "@/lib/auth/current-user";
import { requireEditAccess } from "@/lib/auth/require-edit";
import { runDueReportSchedule } from "./run-report";
import type { ReportFrequency } from "@/lib/supabase/database.types";
import type { ReportMetricKey } from "./metrics";

export type SaveReportInput = {
  reportId: string | null;
  name: string;
  metrics: ReportMetricKey[];
  frequency: ReportFrequency;
  dayOfWeek: number | null;
  dayOfMonth: number | null;
  timeOfDay: string;
  slackChannelId: string;
  messageTemplate: string;
};

export type SaveReportResult = { success: true; id: string } | { success: false; error: string };

/**
 * レポート作成/編集の「保存」(SCREEN_SPEC.md 8章): reports + report_schedules を作成/更新する。
 *
 * view権限のユーザーはこの操作を行えない(SCREEN_SPEC.md「権限」)。
 *
 * TODO(auth): reports.created_by(NOT NULL)に実ユーザーIDが必要なため、
 * ユーザーがpublic.usersに未登録の間は新規作成できない
 * (編集は既存レポートのcreated_byを変更しないため可)。
 */
export async function saveReport(input: SaveReportInput): Promise<SaveReportResult> {
  const authCheck = await requireEditAccess("reports");
  if (!authCheck.ok) return { success: false, error: authCheck.error };

  const supabase = await createSupabaseServerClient();

  let reportId = input.reportId;

  if (reportId) {
    const { error } = await supabase
      .from("reports")
      .update({ name: input.name, metrics: input.metrics })
      .eq("id", reportId);
    if (error) return { success: false, error: error.message };
  } else {
    const currentUserId = await getCurrentUserId();
    if (!currentUserId) {
      return { success: false, error: "ログイン機能が未実装のため、レポートの新規作成は利用できません。" };
    }
    const { data, error } = await supabase
      .from("reports")
      .insert({ name: input.name, metrics: input.metrics, created_by: currentUserId })
      .select("id")
      .single();
    if (error) return { success: false, error: error.message };
    reportId = data.id;
  }

  const schedulePayload = {
    report_id: reportId,
    frequency: input.frequency,
    day_of_week: input.frequency === "weekly" ? input.dayOfWeek : null,
    day_of_month: input.frequency === "monthly" ? input.dayOfMonth : null,
    time_of_day: input.timeOfDay,
    slack_channel_id: input.slackChannelId,
    message_template: input.messageTemplate,
    is_active: true,
  };

  const { data: existingSchedule } = await supabase
    .from("report_schedules")
    .select("id")
    .eq("report_id", reportId)
    .limit(1)
    .maybeSingle();

  const scheduleResult = existingSchedule
    ? await supabase.from("report_schedules").update(schedulePayload).eq("id", existingSchedule.id)
    : await supabase.from("report_schedules").insert(schedulePayload);

  if (scheduleResult.error) {
    return { success: false, error: scheduleResult.error.message };
  }

  revalidatePath("/reports");
  revalidatePath(`/reports/${reportId}`);
  return { success: true, id: reportId };
}

export type RunReportNowResult = { success: true } | { success: false; error: string };

/**
 * 「今すぐ作成」(SCREEN_SPEC.md 8章): 定期実行を待たず、その場でレポートを1回実行する。
 * 集計対象期間はスケジュールのfrequency(週次/月次)に基づき現時点から計算する点は
 * cronによる定期実行(runDueReportSchedule)と同じ。日時のスケジュール判定
 * (isScheduleDueNow)だけを迂回する。
 */
export async function runReportNow(reportId: string): Promise<RunReportNowResult> {
  const authCheck = await requireEditAccess("reports");
  if (!authCheck.ok) return { success: false, error: authCheck.error };

  const supabase = await createSupabaseServerClient();
  const { data: report, error } = await supabase
    .from("reports")
    .select("id, name, metrics, report_schedules(id, frequency, slack_channel_id, message_template)")
    .eq("id", reportId)
    .maybeSingle();

  if (error || !report) {
    return { success: false, error: error?.message ?? "レポートが見つかりません。" };
  }

  const schedule = report.report_schedules?.[0];
  if (!schedule) {
    return { success: false, error: "実行スケジュールが未設定です。先にスケジュールを保存してください。" };
  }

  const result = await runDueReportSchedule(
    {
      scheduleId: schedule.id,
      reportId: report.id,
      reportName: report.name,
      metrics: Array.isArray(report.metrics) ? (report.metrics as ReportMetricKey[]) : [],
      frequency: schedule.frequency,
      slackChannelId: schedule.slack_channel_id,
      messageTemplate: schedule.message_template,
    },
    new Date()
  );

  revalidatePath(`/reports/${reportId}/runs`);
  revalidatePath("/reports");
  return result;
}

export async function deleteReport(reportId: string): Promise<void> {
  const authCheck = await requireEditAccess("reports");
  if (!authCheck.ok) {
    redirect(`/reports/${reportId}`);
  }

  const supabase = await createSupabaseServerClient();
  await supabase.from("reports").delete().eq("id", reportId);
  revalidatePath("/reports");
  redirect("/reports");
}
