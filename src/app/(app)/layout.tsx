import { AppShell } from "@/components/layout/app-shell";
import { PageHeaderProvider } from "@/components/layout/page-header-context";
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
      <AppShell
        currentUser={currentUser}
        pagePermissions={pagePermissions}
        initialNotifications={notifications}
        initialUnreadNotificationCount={unreadNotificationCount}
      >
        {children}
      </AppShell>
    </PageHeaderProvider>
  );
}
