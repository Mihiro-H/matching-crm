import { Header } from "@/components/layout/header";
import { PageHeaderProvider } from "@/components/layout/page-header-context";
import { SideNav } from "@/components/layout/side-nav";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getAllPagePermissionsForCurrentUser } from "@/lib/auth/page-access";
import { getNotificationsForCurrentUser } from "@/lib/notifications/actions";

// (app) はログイン後の画面全体に共通するレイアウト(サイドナビ+ヘッダー)。
// SCREEN_SPEC.md「共通レイアウト」参照。ログイン画面(/login)はこのグループの外に置く。
// currentUserがnullになるのは、Supabase未接続の開発環境、またはmiddlewareの
// リダイレクトをすり抜けた場合の防御的フォールバックのみを想定する。
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const currentUser = await getCurrentUser();
  const pagePermissions = await getAllPagePermissionsForCurrentUser();
  const { items: notifications, unreadCount: unreadNotificationCount } =
    await getNotificationsForCurrentUser();

  return (
    <PageHeaderProvider>
      <div className="flex h-full min-h-screen w-full">
        <SideNav currentUser={currentUser} pagePermissions={pagePermissions} />
        <div className="flex min-w-0 flex-1 flex-col">
          <Header
            currentUser={currentUser}
            initialNotifications={notifications}
            initialUnreadNotificationCount={unreadNotificationCount}
          />
          <main className="flex-1 overflow-y-auto p-6">{children}</main>
        </div>
      </div>
    </PageHeaderProvider>
  );
}
