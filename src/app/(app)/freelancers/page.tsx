import { getFreelancers } from "@/lib/freelancers/get-freelancers";
import { JOB_CATEGORY_LABELS } from "@/lib/job-categories";
import { CsvImportButton } from "@/components/freelancers/csv-import-button";
import { isSupabaseConfigured } from "@/lib/supabase/server";

// TODO(auth): role='admin'以外はアクセス不可にする(SCREEN_SPEC.md 9章「アクセス制限」)。
// 認証実装後、ここでロールチェックを行い、admin以外はnotFound()する。
export default async function FreelancersPage() {
  if (!isSupabaseConfigured()) {
    return <SupabaseNotConfiguredNotice />;
  }

  const { freelancers, error } = await getFreelancers();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <CsvImportButton />
      </div>

      {error && (
        <div className="rounded-lg border border-danger-bg bg-danger-bg p-4 text-sm text-danger-text">
          一覧の取得に失敗しました: {error}
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-neutral-0">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-neutral-100 text-neutral-600">
              <th className="px-4 py-3 font-medium">氏名</th>
              <th className="px-4 py-3 font-medium">メール</th>
              <th className="px-4 py-3 font-medium">対応職種</th>
              <th className="px-4 py-3 font-medium">最終インポート日時</th>
            </tr>
          </thead>
          <tbody>
            {freelancers.map((freelancer) => (
              <tr key={freelancer.id} className="border-b border-neutral-100 last:border-0">
                <td className="px-4 py-3 text-neutral-900">{freelancer.name}</td>
                <td className="px-4 py-3 text-neutral-600">{freelancer.email ?? "-"}</td>
                <td className="px-4 py-3 text-neutral-600">
                  {freelancer.job_categories?.map((c) => JOB_CATEGORY_LABELS[c]).join(" / ") ?? "-"}
                </td>
                <td className="px-4 py-3 text-neutral-600">
                  {freelancer.last_imported_at
                    ? new Date(freelancer.last_imported_at).toLocaleString("ja-JP")
                    : "-"}
                </td>
              </tr>
            ))}
            {freelancers.length === 0 && !error && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-neutral-600">
                  フリーランスが登録されていません。CSVで一括更新してください。
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
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
