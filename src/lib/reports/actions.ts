"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUserId } from "@/lib/auth/current-user";
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
 * TODO(auth): reports.created_by(NOT NULL)に実ユーザーIDが必要なため、
 * 認証未実装の間は新規作成できない(編集は既存レポートのcreated_byを変更しないため可)。
 * TODO(permissions): view権限のユーザーはこの操作を行えない。
 */
export async function saveReport(input: SaveReportInput): Promise<SaveReportResult> {
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

export async function deleteReport(reportId: string): Promise<void> {
  const supabase = await createSupabaseServerClient();
  await supabase.from("reports").delete().eq("id", reportId);
  revalidatePath("/reports");
  redirect("/reports");
}
