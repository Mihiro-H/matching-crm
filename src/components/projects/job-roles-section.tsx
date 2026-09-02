"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { SearchSelectModal, type SearchResultItem } from "@/components/ui/search-select-modal";
import { searchFreelancers } from "@/lib/search-select/actions";
import {
  addProjectRole,
  assignFreelancersToRole,
  removeFreelancerAssignment,
  removeProjectRole,
} from "@/lib/projects/actions";
import { filterUnassignedFreelancers } from "@/lib/projects/job-roles";
import { JOB_CATEGORIES, JOB_CATEGORY_LABELS } from "@/lib/job-categories";
import type { JobCategory } from "@/lib/supabase/database.types";
import type { ProjectRole } from "@/lib/projects/get-project-roles";

export function JobRolesSection({
  projectId,
  initialRoles,
}: {
  projectId: string;
  initialRoles: ProjectRole[];
}) {
  const [roles, setRoles] = useState(initialRoles);
  const [error, setError] = useState<string | null>(null);
  const [assignModalRoleId, setAssignModalRoleId] = useState<string | null>(null);
  const [newCategory, setNewCategory] = useState<JobCategory>("writer");
  const [newHeadcount, setNewHeadcount] = useState(1);

  async function handleAddRole(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const result = await addProjectRole(projectId, newCategory, newHeadcount);
    if (!result.success) {
      setError(result.error);
      return;
    }
    setRoles((prev) => [
      ...prev,
      { id: crypto.randomUUID(), jobCategory: newCategory, headcount: newHeadcount, assignments: [] },
    ]);
    setNewHeadcount(1);
  }

  async function handleRemoveRole(roleId: string) {
    setError(null);
    const previous = roles;
    setRoles((prev) => prev.filter((r) => r.id !== roleId));
    const result = await removeProjectRole(projectId, roleId);
    if (!result.success) {
      setError(result.error);
      setRoles(previous);
    }
  }

  async function handleAssignFreelancers(roleId: string, items: SearchResultItem[]) {
    const result = await assignFreelancersToRole(
      projectId,
      roleId,
      items.map((i) => i.id)
    );
    if (!result.success) {
      setError(result.error);
      return;
    }
    setRoles((prev) =>
      prev.map((role) =>
        role.id === roleId
          ? {
              ...role,
              assignments: [
                ...role.assignments,
                ...items.map((i) => ({ id: crypto.randomUUID(), freelancerId: i.id, freelancerName: i.label })),
              ],
            }
          : role
      )
    );
  }

  async function handleRemoveAssignment(roleId: string, assignmentId: string) {
    setError(null);
    const previous = roles;
    setRoles((prev) =>
      prev.map((role) =>
        role.id === roleId
          ? { ...role, assignments: role.assignments.filter((a) => a.id !== assignmentId) }
          : role
      )
    );
    const result = await removeFreelancerAssignment(projectId, assignmentId);
    if (!result.success) {
      setError(result.error);
      setRoles(previous);
    }
  }

  const assignModalRole = roles.find((r) => r.id === assignModalRoleId) ?? null;

  return (
    <div className="rounded-lg border border-neutral-200 bg-neutral-0 p-6">
      <h3 className="text-md text-neutral-900">職種枠</h3>
      {error && <p className="mt-2 text-sm text-danger-text">{error}</p>}

      <div className="mt-3 flex flex-col gap-3">
        {roles.map((role) => (
          <div key={role.id} className="rounded-md border border-neutral-200 p-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-neutral-900">
                {JOB_CATEGORY_LABELS[role.jobCategory]} {role.headcount}名
              </span>
              <button
                type="button"
                onClick={() => handleRemoveRole(role.id)}
                className="text-xs text-danger-text hover:underline"
              >
                削除
              </button>
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-2">
              {role.assignments.map((a) => (
                <span
                  key={a.id}
                  className="flex items-center gap-1 rounded-full bg-accent-50 py-1 pl-3 pr-1 text-sm text-accent-600"
                >
                  {a.freelancerName}
                  <button
                    type="button"
                    aria-label={`${a.freelancerName}のアサインを解除`}
                    onClick={() => handleRemoveAssignment(role.id, a.id)}
                    className="rounded-full p-0.5 hover:bg-accent-50"
                  >
                    <X size={12} />
                  </button>
                </span>
              ))}
              <button
                type="button"
                onClick={() => setAssignModalRoleId(role.id)}
                className="text-xs text-primary-600 hover:underline"
              >
                フリーランスをアサイン
              </button>
            </div>
          </div>
        ))}
      </div>

      <form onSubmit={handleAddRole} className="mt-4 flex items-end gap-2">
        <label className="flex flex-col gap-1">
          <span className="text-xs text-neutral-600">職種</span>
          <select
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value as JobCategory)}
            className="rounded-md border border-neutral-200 bg-neutral-0 px-3 py-2 text-sm text-neutral-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
          >
            {JOB_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {JOB_CATEGORY_LABELS[category]}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-neutral-600">人数</span>
          <input
            type="number"
            min={1}
            value={newHeadcount}
            onChange={(e) => setNewHeadcount(Math.max(1, Number(e.target.value)))}
            className="w-20 rounded-md border border-neutral-200 bg-neutral-0 px-3 py-2 text-sm text-neutral-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
          />
        </label>
        <button type="submit" className="rounded-md bg-primary-500 px-4 py-2 text-sm text-neutral-0">
          +職種を追加
        </button>
      </form>

      <SearchSelectModal
        isOpen={assignModalRole !== null}
        onClose={() => setAssignModalRoleId(null)}
        title="フリーランスをアサイン"
        placeholder="氏名で検索"
        mode="multiple"
        confirmLabel="アサイン"
        search={async (query) => {
          const results = await searchFreelancers(query);
          return filterUnassignedFreelancers(
            assignModalRole?.assignments.map((a) => a.freelancerId) ?? [],
            results
          );
        }}
        onConfirm={(items) => {
          if (assignModalRole) handleAssignFreelancers(assignModalRole.id, items);
        }}
      />
    </div>
  );
}
