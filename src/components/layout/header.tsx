"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { NAV_ITEMS } from "@/lib/navigation";
import { usePageHeader } from "./page-header-context";
import { NotificationBell } from "./notification-bell";
import type { CurrentUser } from "@/lib/auth/current-user";
import type { NotificationItem } from "@/lib/notifications/actions";

function currentNavLabel(pathname: string): string {
  const match = NAV_ITEMS.find(
    (item) => pathname === item.href || pathname.startsWith(`${item.href}/`)
  );
  return match?.label ?? "Orbit";
}

// アカウントメニュー(ログアウト等)はサイドナビ下部に集約している。
// ヘッダーのアバターは現在ログイン中であることを示す表示のみ。
export function Header({
  currentUser,
  initialNotifications,
  initialUnreadNotificationCount,
}: {
  currentUser: CurrentUser | null;
  initialNotifications: NotificationItem[];
  initialUnreadNotificationCount: number;
}) {
  const pathname = usePathname();
  const breadcrumbs = usePageHeader();
  const title = currentNavLabel(pathname);

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-neutral-100 bg-neutral-0 px-6">
      <div className="text-xl text-neutral-900">
        {breadcrumbs && breadcrumbs.length > 0 ? (
          <nav className="flex items-center gap-2">
            {breadcrumbs.map((crumb, i) => (
              <span key={i} className="flex items-center gap-2">
                {i > 0 && <span className="text-neutral-400">/</span>}
                {crumb.href ? (
                  <Link href={crumb.href} className="text-neutral-600 hover:text-primary-600">
                    {crumb.label}
                  </Link>
                ) : (
                  <span>{crumb.label}</span>
                )}
              </span>
            ))}
          </nav>
        ) : (
          <h1>{title}</h1>
        )}
      </div>

      <div className="flex items-center gap-4">
        <NotificationBell
          initialItems={initialNotifications}
          initialUnreadCount={initialUnreadNotificationCount}
        />

        <span
          aria-label={currentUser ? `ログイン中: ${currentUser.name}` : "未ログイン"}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-100 text-sm font-medium text-primary-600"
        >
          {currentUser ? currentUser.name.slice(0, 1) : "?"}
        </span>
      </div>
    </header>
  );
}
