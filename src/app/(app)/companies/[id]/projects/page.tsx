import Link from "next/link";
import { getCompanyProjects } from "@/lib/companies/get-company-projects";
import { PROJECT_STATUS_META } from "@/lib/status-badges";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatCurrencyJPY, formatDateJa } from "@/lib/format";

export default async function CompanyProjectsTab({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { projects, error } = await getCompanyProjects(id);

  if (error) {
    return <p className="text-sm text-danger-text">案件の取得に失敗しました: {error}</p>;
  }

  if (projects.length === 0) {
    return <p className="text-sm text-neutral-600">この企業に紐づく案件はまだありません。</p>;
  }

  return (
    <div className="grid grid-cols-2 gap-4">
      {projects.map((project) => (
        <Link
          key={project.id}
          href={`/projects/${project.id}`}
          className="rounded-lg border border-neutral-200 bg-neutral-0 p-4 hover:border-primary-500"
        >
          <div className="flex items-start justify-between">
            <h3 className="text-md text-neutral-900">{project.title}</h3>
            <StatusBadge meta={PROJECT_STATUS_META[project.status]} />
          </div>
          <dl className="mt-2 flex gap-4 text-xs text-neutral-600">
            {project.budget !== null && (
              <div>
                <dt className="inline">予算: </dt>
                <dd className="inline">{formatCurrencyJPY(project.budget)}</dd>
              </div>
            )}
            {project.deadline && (
              <div>
                <dt className="inline">納期: </dt>
                <dd className="inline">{formatDateJa(project.deadline)}</dd>
              </div>
            )}
          </dl>
        </Link>
      ))}
    </div>
  );
}
