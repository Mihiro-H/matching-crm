import Link from "next/link";
import { getReports } from "@/lib/reports/get-reports";
import { ReportsTable } from "@/components/reports/reports-table";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { requirePageAccess } from "@/lib/auth/page-access";

export default async function ReportsPage() {
  if (!isSupabaseConfigured()) {
    return <SupabaseNotConfiguredNotice />;
  }

  const { canEdit } = await requirePageAccess("reports");
  const { reports, error } = await getReports();

  return (
    <div className="flex flex-col gap-4">
      {canEdit && (
        <div className="flex justify-end">
          <Link href="/reports/new" className="rounded-md bg-primary-500 px-4 py-2 text-sm text-neutral-0">
            +レポートを作成
          </Link>
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-danger-bg bg-danger-bg p-4 text-sm text-danger-text">
          一覧の取得に失敗しました: {error}
        </div>
      )}

      {!error && <ReportsTable reports={reports} />}
    </div>
  );
}

function SupabaseNotConfiguredNotice() {
  return (
    <div className="rounded-lg border border-neutral-200 bg-neutral-0 p-8">
      <h2 className="text-lg text-neutral-900">Supabase未接続です</h2>
      <p className="mt-2 text-sm text-neutral-600">
        Supabaseの接続情報を .env に設定すると、一覧が表示されます。
      </p>
    </div>
  );
}
