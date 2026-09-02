import { Header } from "@/components/layout/header";
import { PageHeaderProvider } from "@/components/layout/page-header-context";
import { SideNav } from "@/components/layout/side-nav";

// (app) はログイン後の画面全体に共通するレイアウト(サイドナビ+ヘッダー)。
// SCREEN_SPEC.md「共通レイアウト」参照。ログイン画面(/login)はこのグループの外に置く。
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <PageHeaderProvider>
      <div className="flex h-full min-h-screen w-full">
        <SideNav />
        <div className="flex min-w-0 flex-1 flex-col">
          <Header />
          <main className="flex-1 overflow-y-auto p-6">{children}</main>
        </div>
      </div>
    </PageHeaderProvider>
  );
}
