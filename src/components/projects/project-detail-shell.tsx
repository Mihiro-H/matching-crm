"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { usePageBreadcrumbs } from "@/components/layout/page-header-context";
import { PROJECT_STATUS_META } from "@/lib/status-badges";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatCurrencyJPY, formatDateJa } from "@/lib/format";
import type { ProjectDetail } from "@/lib/projects/get-project";
import type { ProjectAssignee } from "@/lib/projects/get-project-assignees";
import type { ProjectRole } from "@/lib/projects/get-project-roles";
import { AssigneeSection } from "./assignee-section";
import { JobRolesSection } from "./job-roles-section";

const TABS = [
  { key: "estimates", label: "見積・契約" },
  { key: "invoices", label: "請求" },
  { key: "meeting-notes", label: "議事録" },
] as const;

export function ProjectDetailShell({
  project,
  assignees,
  roles,
  canEdit,
  children,
}: {
  project: ProjectDetail;
  assignees: ProjectAssignee[];
  roles: ProjectRole[];
  canEdit: boolean;
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  usePageBreadcrumbs([
    { label: "案件管理", href: "/projects" },
    { label: project.title },
  ]);

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-lg border border-neutral-200 bg-neutral-0 p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-neutral-600">{project.companyName}</p>
            <h2 className="mt-1 text-lg text-neutral-900">{project.title}</h2>
          </div>
          <StatusBadge meta={PROJECT_STATUS_META[project.status]} />
        </div>
        <dl className="mt-4 flex gap-6 text-sm">
          <div>
            <dt className="text-xs text-neutral-600">予算</dt>
            <dd className="text-neutral-900">
              {project.budget !== null ? formatCurrencyJPY(project.budget) : "-"}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-neutral-600">納期</dt>
            <dd className="text-neutral-900">
              {project.deadline ? formatDateJa(project.deadline) : "-"}
            </dd>
          </div>
        </dl>
      </div>

      <AssigneeSection projectId={project.id} initialAssignees={assignees} canEdit={canEdit} />
      <JobRolesSection projectId={project.id} initialRoles={roles} canEdit={canEdit} />

      <nav className="flex gap-1 border-b border-neutral-100">
        {TABS.map((tab) => {
          const href = `/projects/${project.id}/${tab.key}`;
          const isActive = pathname === href;
          return (
            <Link
              key={tab.key}
              href={href}
              className={`px-4 py-2 text-sm ${
                isActive
                  ? "border-b-2 border-primary-500 text-primary-600"
                  : "text-neutral-600 hover:text-primary-600"
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>
      {children}
    </div>
  );
}
