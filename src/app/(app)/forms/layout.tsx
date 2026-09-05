import { requireAdminPageAccess } from "@/lib/auth/page-access";

// フォーム管理はサイドバー直下のトップレベル項目(SCREEN_SPEC.md)。
// settings同様、role='admin'限定(ページ権限の設定に関わらず)。
export default async function FormsLayout({ children }: { children: React.ReactNode }) {
  await requireAdminPageAccess();

  return <>{children}</>;
}
