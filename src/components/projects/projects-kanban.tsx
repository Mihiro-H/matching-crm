"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import type { ProjectListRow } from "@/lib/projects/get-projects";
import type { ProjectStatus } from "@/lib/supabase/database.types";
import { PROJECT_STATUS_META } from "@/lib/status-badges";
import { PROJECT_STATUS_ORDER, isManualDropAllowed } from "@/lib/projects/status-transitions";
import { updateProjectStatus } from "@/lib/projects/actions";
import { formatRoleSummary } from "@/lib/job-categories";

export function ProjectsKanban({ projects: initialProjects }: { projects: ProjectListRow[] }) {
  const [projects, setProjects] = useState(initialProjects);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleDrop(targetStatus: ProjectStatus, projectId: string) {
    setError(null);
    if (!isManualDropAllowed(targetStatus)) {
      setError("「契約済」への変更はクラウドサイン連携によって自動的に行われます。");
      return;
    }

    const previous = projects;
    setProjects((current) =>
      current.map((p) => (p.id === projectId ? { ...p, status: targetStatus } : p))
    );

    startTransition(async () => {
      const result = await updateProjectStatus(projectId, targetStatus);
      if (!result.success) {
        setError(result.error);
        setProjects(previous);
      }
    });
  }

  return (
    <div className="flex flex-col gap-3">
      {error && (
        <div className="rounded-lg border border-danger-bg bg-danger-bg p-3 text-sm text-danger-text">
          {error}
        </div>
      )}

      <div className="flex gap-3 overflow-x-auto pb-2">
        {PROJECT_STATUS_ORDER.map((status) => {
          const meta = PROJECT_STATUS_META[status];
          const columnProjects = projects.filter((p) => p.status === status);
          const dropAllowed = isManualDropAllowed(status);

          return (
            <div
              key={status}
              className={`flex w-64 shrink-0 flex-col gap-2 rounded-lg border p-3 ${
                dropAllowed
                  ? "border-neutral-200 bg-page-bg"
                  : "border-neutral-200 bg-neutral-100 opacity-60"
              }`}
              onDragOver={(e) => {
                if (dropAllowed) e.preventDefault();
              }}
              onDrop={(e) => {
                e.preventDefault();
                if (draggingId) handleDrop(status, draggingId);
              }}
            >
              <h3 className="text-sm text-neutral-900">
                {meta.label}
                <span className="ml-2 text-xs text-neutral-600">{columnProjects.length}</span>
              </h3>

              <div className="flex flex-col gap-2">
                {columnProjects.map((project) => (
                  <div
                    key={project.id}
                    draggable
                    onDragStart={() => setDraggingId(project.id)}
                    onDragEnd={() => setDraggingId(null)}
                    className={`cursor-move rounded-md border border-neutral-200 bg-neutral-0 p-3 ${
                      isPending ? "opacity-70" : ""
                    }`}
                  >
                    <Link href={`/projects/${project.id}`} className="text-sm text-primary-600 hover:underline">
                      {project.title}
                    </Link>
                    <p className="mt-1 text-xs text-neutral-600">{project.companyName}</p>
                    {project.roleSummary.length > 0 && (
                      <p className="mt-1 text-xs text-neutral-600">{formatRoleSummary(project.roleSummary)}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
