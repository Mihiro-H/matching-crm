"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS } from "@/lib/navigation";
import { Logo } from "./logo";

// TODO(auth): ログイン実装後、実際のセッションユーザーに置き換える
const MOCK_CURRENT_USER = {
  name: "山田 太郎",
  departmentName: "営業部",
  isAdmin: true,
};

// TODO(permissions): user_page_permissions / department_page_permissions
// の実データが揃うまでの仮実装。hidden権限のページを除外するロジックを
// ここに追加する。
function useVisibleNavItems() {
  return NAV_ITEMS.filter((item) => !item.adminOnly || MOCK_CURRENT_USER.isAdmin);
}

export function SideNav() {
  const pathname = usePathname();
  const items = useVisibleNavItems();

  return (
    <nav className="flex h-full w-[220px] shrink-0 flex-col border-r border-neutral-200 bg-neutral-0">
      <div className="p-4">
        <Logo />
      </div>

      <ul className="flex-1 overflow-y-auto px-2">
        {items.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;

          return (
            <li key={item.pageKey}>
              <Link
                href={item.href}
                className={`relative flex items-center gap-3 rounded-md px-3 py-2 text-sm ${
                  isActive
                    ? "bg-primary-50 text-primary-600"
                    : "text-neutral-600 hover:bg-page-bg"
                }`}
              >
                {isActive && (
                  <span className="absolute inset-y-1 left-0 w-1 rounded-full bg-primary-500" />
                )}
                <Icon size={18} strokeWidth={2} />
                <span>{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>

      <button
        type="button"
        className="flex items-center gap-3 border-t border-neutral-100 p-4 text-left hover:bg-page-bg"
        // TODO(auth): アカウントメニュー(ログアウト等)を実装する
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-100 text-sm font-medium text-primary-600">
          {MOCK_CURRENT_USER.name.slice(0, 1)}
        </span>
        <span className="flex flex-col">
          <span className="text-sm text-neutral-900">{MOCK_CURRENT_USER.name}</span>
          <span className="text-xs text-neutral-600">{MOCK_CURRENT_USER.departmentName}</span>
        </span>
      </button>
    </nav>
  );
}
