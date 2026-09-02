import type { LucideIcon } from "lucide-react";
import {
  Banknote,
  Building2,
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
  | "contacts"
  | "companies"
  | "projects"
  | "estimates"
  | "meeting_notes"
  | "invoices"
  | "reports"
  | "freelancers"
  | "settings";

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
  { pageKey: "contacts", label: "商談・担当者管理", href: "/contacts", icon: Inbox },
  { pageKey: "companies", label: "企業一覧", href: "/companies", icon: Building2 },
  { pageKey: "projects", label: "案件管理", href: "/projects", icon: SquareKanban },
  { pageKey: "estimates", label: "見積・発注", href: "/estimates", icon: FileSignature },
  { pageKey: "meeting_notes", label: "議事録", href: "/meeting-notes", icon: NotebookText },
  { pageKey: "invoices", label: "精算管理", href: "/invoices", icon: Banknote },
  { pageKey: "reports", label: "レポート", href: "/reports", icon: ChartColumn },
  { pageKey: "freelancers", label: "フリーランス一覧", href: "/freelancers", icon: UsersRound, adminOnly: true },
  { pageKey: "settings", label: "設定", href: "/settings", icon: Settings, adminOnly: true },
];
