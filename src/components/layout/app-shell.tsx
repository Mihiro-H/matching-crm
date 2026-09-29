"use client";

import { useState } from "react";
import { Header } from "./header";
import { SideNav, SIDE_NAV_WIDTH_CLASS } from "./side-nav";
import type { CurrentUser } from "@/lib/auth/current-user";
import type { NotificationItem } from "@/lib/notifications/actions";
import type { PagePermission } from "@/lib/supabase/database.types";

/**
 * ログイン後画面の外枠(サイドナビ+ヘッダー+メイン)。
 * 外枠を画面の高さに固定し、スクロールはmainだけに閉じ込める(ヘッダー・サイドナビを
 * 常に固定表示し、ブラウザの高さが変わってもサイドナビが画面下端まで届くようにするため)。
 * サイドナビの開閉stateは、ページ遷移でアンマウントされないここで持つ。
 * 「一時的に隠す」用途のため永続化はせず、再読み込みすると開いた状態に戻る。
 */
export function AppShell({
  currentUser,
  pagePermissions,
  initialNotifications,
  initialUnreadNotificationCount,
  children,
}: {
  currentUser: CurrentUser | null;
  pagePermissions: Record<string, PagePermission>;
  initialNotifications: NotificationItem[];
  initialUnreadNotificationCount: number;
  children: React.ReactNode;
}) {
  const [isSideNavOpen, setIsSideNavOpen] = useState(true);

  return (
    <div className="flex h-dvh w-full overflow-hidden">
      {/*
        中身(SideNav)の幅は固定のまま外側の幅だけを縮める(中身ごと縮めると
        文字が折り返してガタつくため)。閉じている間はinertでフォーカスも入らないようにする。
      */}
      <div
        className={`shrink-0 overflow-hidden transition-[width] duration-200 ${
          isSideNavOpen ? SIDE_NAV_WIDTH_CLASS : "w-0"
        }`}
        inert={!isSideNavOpen}
      >
        <SideNav
          currentUser={currentUser}
          pagePermissions={pagePermissions}
          onCollapse={() => setIsSideNavOpen(false)}
        />
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <Header
          currentUser={currentUser}
          initialNotifications={initialNotifications}
          initialUnreadNotificationCount={initialUnreadNotificationCount}
          isSideNavOpen={isSideNavOpen}
          onExpandSideNav={() => setIsSideNavOpen(true)}
        />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
