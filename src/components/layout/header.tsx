"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { Bell } from "lucide-react";
import { NAV_ITEMS } from "@/lib/navigation";
import { usePageHeader } from "./page-header-context";
import type { CurrentUser } from "@/lib/auth/current-user";

// TODO(notifications): notification_settings / 実イベントに応じて未読有無を取得する
const MOCK_HAS_UNREAD_NOTIFICATIONS = true;

function currentNavLabel(pathname: string): string {
  const match = NAV_ITEMS.find(
    (item) => pathname === item.href || pathname.startsWith(`${item.href}/`)
  );
  return match?.label ?? "Orbit";
}

// アカウントメニュー(ログアウト等)はサイドナビ下部に集約している。
// ヘッダーのアバターは現在ログイン中であることを示す表示のみ。
export function Header({ currentUser }: { currentUser: CurrentUser | null }) {
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
        <button
          type="button"
          aria-label="通知"
          className="relative rounded-full p-2 text-neutral-600 hover:bg-page-bg"
          // TODO(notifications): 通知一覧の実装
        >
          <Bell size={20} />
          {MOCK_HAS_UNREAD_NOTIFICATIONS && (
            <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-warning-text" />
          )}
        </button>

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
