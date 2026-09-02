import { NAV_ITEMS } from "@/lib/navigation";

/** 権限設定マトリクスの行(SCREEN_SPEC.md 10章 9-2)。ページ一覧はナビゲーション定義と共通。 */
export const PERMISSION_PAGE_KEYS = NAV_ITEMS.map((item) => ({
  pageKey: item.pageKey as string,
  label: item.label,
}));
