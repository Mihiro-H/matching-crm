import Link from "next/link";
import { getFreelancers } from "@/lib/freelancers/get-freelancers";
import { JOB_CATEGORY_LABELS, JOB_CATEGORY_TAG_STYLES } from "@/lib/job-categories";
import { CsvImportButton } from "@/components/freelancers/csv-import-button";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { requireAdminPageAccess } from "@/lib/auth/page-access";

// SCREEN_SPEC.md 9章「アクセス制限」: role='admin'以外はURLを直接叩いてもアクセス不可。
export default async function FreelancersPage() {
  if (!isSupabaseConfigured()) {
    return <SupabaseNotConfiguredNotice />;
  }

  await requireAdminPageAccess();

  const { freelancers, error } = await getFreelancers();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-end gap-4">
        <p className="text-left text-xs text-neutral-600">
          フリーランス情報はここでは編集できません。Orbitプラットフォームで編集してインポートしてください。
        </p>
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
              <th className="px-4 py-3 font-medium">ID</th>
              <th className="px-4 py-3 font-medium">氏名</th>
              <th className="px-4 py-3 font-medium">メール</th>
              <th className="px-4 py-3 font-medium">対応職種</th>
              <th className="px-4 py-3 font-medium">進行中案件数</th>
              <th className="px-4 py-3 font-medium">最終インポート日時</th>
            </tr>
          </thead>
          <tbody>
            {freelancers.map((freelancer) => (
              <tr key={freelancer.id} className="border-b border-neutral-100 last:border-0">
                <td className="px-4 py-3 text-neutral-600">{freelancer.platformFreelancerId}</td>
                <td className="px-4 py-3">
                  <Link
                    href={`/freelancers/${freelancer.id}`}
                    className="text-primary-600 hover:underline"
                  >
                    {freelancer.name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-neutral-600">{freelancer.email ?? "-"}</td>
                <td className="px-4 py-3">
                  {freelancer.jobCategories && freelancer.jobCategories.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {freelancer.jobCategories.map((c) => (
                        <span
                          key={c}
                          className={`rounded-sm px-2 py-0.5 text-xs ${JOB_CATEGORY_TAG_STYLES[c]}`}
                        >
                          {JOB_CATEGORY_LABELS[c]}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-neutral-600">-</span>
                  )}
                </td>
                <td className="px-4 py-3 text-neutral-600">{freelancer.activeProjectCount}</td>
                <td className="px-4 py-3 text-neutral-600">
                  {freelancer.lastImportedAt
                    ? new Date(freelancer.lastImportedAt).toLocaleString("ja-JP")
                    : "-"}
                </td>
              </tr>
            ))}
            {freelancers.length === 0 && !error && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-neutral-600">
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
