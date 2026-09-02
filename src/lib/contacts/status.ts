import type { ContactStatus } from "@/lib/supabase/database.types";

/**
 * 商談・担当者管理画面(SCREEN_SPEC.md 2章)のステータス遷移ルール。
 * new→in_progress→negotiating→won/lost という基本の流れに沿って、
 * 各段階から失注(lost)にはいつでも移れるものとして実装する
 * (lost_reason入力必須の仕様上、negotiatingまで進まずに失注するケースも
 * 現実的にあるため)。won/lostは終端状態で、それ以上の遷移はない。
 */
export function getNextStatusOptions(current: ContactStatus): Exclude<ContactStatus, "new">[] {
  switch (current) {
    case "new":
      return ["in_progress", "lost"];
    case "in_progress":
      return ["negotiating", "lost"];
    case "negotiating":
      return ["won", "lost"];
    case "won":
    case "lost":
      return [];
  }
}
