import type { LucideIcon } from "lucide-react";
import {
  Banknote,
  Building2,
  ClipboardList,
  Contact,
  FileSignature,
  Inbox,
  LayoutDashboard,
  NotebookText,
  Settings,
  SquareKanban,
  UsersRound,
  ChartColumn,
} from "lucide-react";

/**
 * page_key は user_page_permissions / department_page_permissions と
 * 1対1で対応する識別子 (SCREEN_SPEC.md 冒頭「ナビゲーション構成」参照)。
 */
export type PageKey =
  | "dashboard"
  | "deals"
  | "companies"
  | "people"
  | "projects"
  | "estimates"
  | "meeting_notes"
  | "invoices"
  | "reports"
  | "freelancers"
  | "forms"
  | "settings";

/**
 * companies/people はサイドバーに項目としては表示するが、既定では非表示にする
 * (user_page_permissions に明示的な行が無いユーザーには「hidden」を初期値とする)。
 * それ以外のページは従来通り「view」が初期値(DB_SCHEMA.md確定事項)。
 * getPagePermission / getAllPagePermissionsForCurrentUser (page-access.ts) 参照。
 */
export const DEFAULT_HIDDEN_PAGE_KEYS: PageKey[] = ["companies", "people"];

export type NavItem = {
  pageKey: PageKey;
  label: string;
  href: string;
  icon: LucideIcon;
  /** role='admin' 以外はサイドナビに表示しない (SCREEN_SPEC.md) */
  adminOnly?: boolean;
};

export const NAV_ITEMS: NavItem[] = [
  { pageKey: "dashboard", label: "ダッシュボード", href: "/dashboard", icon: LayoutDashboard },
  { pageKey: "deals", label: "商談管理", href: "/deals", icon: Inbox },
  { pageKey: "projects", label: "案件管理", href: "/projects", icon: SquareKanban },
  { pageKey: "companies", label: "企業一覧", href: "/companies", icon: Building2 },
  { pageKey: "people", label: "担当者一覧", href: "/people", icon: Contact },
  { pageKey: "meeting_notes", label: "議事録", href: "/meeting-notes", icon: NotebookText },
  { pageKey: "estimates", label: "見積・発注", href: "/estimates", icon: FileSignature },
  { pageKey: "invoices", label: "精算管理", href: "/invoices", icon: Banknote },
  { pageKey: "reports", label: "レポート", href: "/reports", icon: ChartColumn },
  { pageKey: "freelancers", label: "フリーランス一覧", href: "/freelancers", icon: UsersRound, adminOnly: true },
  { pageKey: "forms", label: "フォーム管理", href: "/forms", icon: ClipboardList, adminOnly: true },
  { pageKey: "settings", label: "設定", href: "/settings", icon: Settings, adminOnly: true },
];
