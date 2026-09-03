"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import type { NotificationEventType } from "@/lib/supabase/database.types";

export type NotificationItem = {
  id: string;
  eventType: NotificationEventType;
  title: string;
  linkPath: string | null;
  isRead: boolean;
  createdAt: string;
};

const RECENT_NOTIFICATIONS_LIMIT = 20;

/** ヘッダーのベルアイコンに表示する、ログイン中ユーザー宛の直近通知と未読件数。 */
export async function getNotificationsForCurrentUser(): Promise<{
  items: NotificationItem[];
  unreadCount: number;
}> {
  const user = await getCurrentUser();
  if (!user) return { items: [], unreadCount: 0 };

  const supabase = await createSupabaseServerClient();

  const [{ data: rows }, { count }] = await Promise.all([
    supabase
      .from("notifications")
      .select("id, event_type, title, link_path, read_at, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(RECENT_NOTIFICATIONS_LIMIT),
    supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .is("read_at", null),
  ]);

  const items: NotificationItem[] = (rows ?? []).map((row) => ({
    id: row.id,
    eventType: row.event_type,
    title: row.title,
    linkPath: row.link_path,
    isRead: row.read_at !== null,
    createdAt: row.created_at,
  }));

  return { items, unreadCount: count ?? 0 };
}

/** 個別の通知を既読にする。他人の通知を既読にできないよう、必ず自分のuser_idで絞る。 */
export async function markNotificationRead(id: string): Promise<void> {
  const user = await getCurrentUser();
  if (!user) return;

  const supabase = await createSupabaseServerClient();
  await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", user.id);
}

export async function markAllNotificationsRead(): Promise<void> {
  const user = await getCurrentUser();
  if (!user) return;

  const supabase = await createSupabaseServerClient();
  await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .is("read_at", null);
}
