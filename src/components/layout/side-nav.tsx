"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS } from "@/lib/navigation";
import { signOut } from "@/lib/auth/actions";
import type { CurrentUser } from "@/lib/auth/current-user";
import type { PagePermission } from "@/lib/supabase/database.types";
import { Logo } from "./logo";

/**
 * SCREEN_SPEC.md 共通レイアウト:
 * - hidden権限のページはサイドナビに表示しない(department_page_permissions側の
 *   テンプレートは既にuser_page_permissionsへ一括適用済みという前提なので、
 *   ここではuser_page_permissionsのみ見ればよい)
 * - settings/freelancersはadminロール限定(権限設定に関わらず)
 */
function useVisibleNavItems(isAdmin: boolean, pagePermissions: Record<string, PagePermission>) {
  return NAV_ITEMS.filter((item) => {
    if (item.adminOnly && !isAdmin) return false;
    return pagePermissions[item.pageKey] !== "hidden";
  });
}

export function SideNav({
  currentUser,
  pagePermissions,
}: {
  currentUser: CurrentUser | null;
  pagePermissions: Record<string, PagePermission>;
}) {
  const pathname = usePathname();
  const items = useVisibleNavItems(currentUser?.role === "admin", pagePermissions);

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

      {currentUser ? (
        <div className="flex items-center gap-3 border-t border-neutral-100 p-4">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-100 text-sm font-medium text-primary-600">
            {currentUser.name.slice(0, 1)}
          </span>
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-sm text-neutral-900">{currentUser.name}</span>
            <span className="truncate text-xs text-neutral-600">
              {currentUser.departmentName ?? "部署未設定"}
            </span>
          </span>
          <form action={signOut}>
            <button type="submit" className="text-xs text-neutral-600 hover:text-primary-600">
              ログアウト
            </button>
          </form>
        </div>
      ) : (
        <Link
          href="/login"
          className="border-t border-neutral-100 p-4 text-center text-sm text-primary-600 hover:bg-page-bg"
        >
          ログインしてください
        </Link>
      )}
    </nav>
  );
}
