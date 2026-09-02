"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import type { NotificationEventType } from "@/lib/supabase/database.types";

export type MutationResult = { success: true } | { success: false; error: string };

/**
 * 通知設定の保存(SCREEN_SPEC.md 10章 9-1)。
 * event_typeにunique制約を追加済みのため onConflict で1イベント種別1行を保つ。
 * settingsページ自体がadmin限定(SCREEN_SPEC.mdナビゲーション権限)のため、
 * サーバー側でも確認する。
 */
export async function saveNotificationSetting(input: {
  eventType: NotificationEventType;
  slackChannelId: string;
  messageTemplate: string;
  isActive: boolean;
}): Promise<MutationResult> {
  const authCheck = await requireAdmin();
  if (!authCheck.ok) return { success: false, error: authCheck.error };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("notification_settings").upsert(
    {
      event_type: input.eventType,
      slack_channel_id: input.slackChannelId,
      message_template: input.messageTemplate,
      is_active: input.isActive,
    },
    { onConflict: "event_type" }
  );

  if (error) return { success: false, error: error.message };

  revalidatePath("/settings");
  return { success: true };
}
