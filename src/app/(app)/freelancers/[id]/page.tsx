import Link from "next/link";
import { notFound } from "next/navigation";
import { getFreelancerAssignments, getFreelancerById } from "@/lib/freelancers/get-freelancer";
import { JOB_CATEGORY_LABELS, JOB_CATEGORY_TAG_STYLES } from "@/lib/job-categories";
import { PROJECT_STATUS_META } from "@/lib/status-badges";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatDateJa } from "@/lib/format";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { requireAdminPageAccess } from "@/lib/auth/page-access";
import { SupabaseNotConfiguredNotice } from "@/components/ui/supabase-not-configured-notice";

// SCREEN_SPEC.md 9章「アクセス制限」: role='admin'以外はURLを直接叩いてもアクセス不可。
export default async function FreelancerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!isSupabaseConfigured()) {
    return <SupabaseNotConfiguredNotice />;
  }

  await requireAdminPageAccess();

  const { id } = await params;
  const freelancer = await getFreelancerById(id);
  if (!freelancer) {
    notFound();
  }

  const { assignments, error } = await getFreelancerAssignments(id);

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-lg border border-neutral-200 bg-neutral-0 p-6">
        <p className="text-xs text-neutral-600">{freelancer.platformFreelancerId}</p>
        <h2 className="mt-1 text-lg text-neutral-900">{freelancer.name}</h2>
        <dl className="mt-4 grid grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="text-xs text-neutral-600">メール</dt>
            <dd className="text-neutral-900">{freelancer.email ?? "-"}</dd>
          </div>
          <div>
            <dt className="text-xs text-neutral-600">対応職種</dt>
            <dd className="mt-1 flex flex-wrap gap-1">
              {freelancer.jobCategories && freelancer.jobCategories.length > 0
                ? freelancer.jobCategories.map((c) => (
                    <span
                      key={c}
                      className={`rounded-sm px-2 py-0.5 text-xs ${JOB_CATEGORY_TAG_STYLES[c]}`}
                    >
                      {JOB_CATEGORY_LABELS[c]}
                    </span>
                  ))
                : "-"}
            </dd>
          </div>
        </dl>
        <p className="mt-4 text-xs text-neutral-600">
          フリーランス情報はここでは編集できません。Orbitプラットフォームで編集してインポートしてください。
        </p>
      </div>

      <div className="rounded-lg border border-neutral-200 bg-neutral-0 p-6">
        <h3 className="text-md text-neutral-900">アサインされている案件</h3>

        {error && (
          <p className="mt-2 text-sm text-danger-text">案件一覧の取得に失敗しました: {error}</p>
        )}

        {!error && assignments.length === 0 && (
          <p className="mt-3 text-sm text-neutral-600">アサインされている案件はありません。</p>
        )}

        {!error && assignments.length > 0 && (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-neutral-100 text-neutral-600">
                  <th className="px-4 py-3 font-medium">企業名</th>
                  <th className="px-4 py-3 font-medium">案件名</th>
                  <th className="px-4 py-3 font-medium">ステータス</th>
                  <th className="px-4 py-3 font-medium">職種</th>
                  <th className="px-4 py-3 font-medium">アサイン日</th>
                </tr>
              </thead>
              <tbody>
                {assignments.map((assignment) => (
                  <tr key={assignment.id} className="border-b border-neutral-100 last:border-0">
                    <td className="px-4 py-3 text-neutral-600">{assignment.companyName}</td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/projects/${assignment.projectNumber}`}
                        className="text-primary-600 hover:underline"
                      >
                        {assignment.projectTitle}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge meta={PROJECT_STATUS_META[assignment.projectStatus]} />
                    </td>
                    <td className="px-4 py-3 text-neutral-600">
                      {JOB_CATEGORY_LABELS[assignment.jobCategory]}
                    </td>
                    <td className="px-4 py-3 text-neutral-600">{formatDateJa(assignment.assignedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
