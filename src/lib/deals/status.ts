import type { DealStatus } from "@/lib/supabase/database.types";

/**
 * 商談管理画面(SCREEN_SPEC.md「商談管理」)のステータス遷移ルール。
 * new→in_progress→negotiating→won/lost という基本の流れに沿って、
 * 各段階から失注(lost)・保留(on_hold)にはいつでも移れるものとして実装する。
 * on_holdからは(どの段階で保留にしたかを問わず)in_progress以降のどこへでも
 * 再開できるようにする。won/lostは終端状態で、それ以上の遷移はない。
 * estimate_submitted(見積提出済)は見積書作成時にのみ自動で設定されるため
 * (estimates/actions.ts参照)、ここでは手動の遷移先として一切返さない。
 */
export function getNextStatusOptions(current: DealStatus): Exclude<DealStatus, "new">[] {
  switch (current) {
    case "new":
      return ["in_progress", "on_hold", "lost"];
    case "in_progress":
      return ["negotiating", "on_hold", "lost"];
    case "negotiating":
      return ["won", "on_hold", "lost"];
    case "on_hold":
      return ["in_progress", "negotiating", "won", "lost"];
    case "won":
    case "estimate_submitted":
    case "lost":
      return [];
  }
}
