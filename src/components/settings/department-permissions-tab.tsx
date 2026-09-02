"use client";

import { useEffect, useState } from "react";
import { PermissionMatrix } from "./permission-matrix";
import { getDepartmentPagePermissions, type Department, type UserOption } from "@/lib/settings/get-permissions";
import { PERMISSION_PAGE_KEYS } from "@/lib/settings/permission-pages";
import { applyDepartmentTemplateToMembers, saveDepartmentTemplate } from "@/lib/settings/permission-actions";
import type { PagePermission } from "@/lib/supabase/database.types";

export function DepartmentPermissionsTab({
  departments,
  users,
}: {
  departments: Department[];
  users: UserOption[];
}) {
  const [departmentId, setDepartmentId] = useState(departments[0]?.id ?? "");
  const [values, setValues] = useState<Record<string, PagePermission> | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const selectedDepartment = departments.find((d) => d.id === departmentId) ?? null;
  const memberCount = users.filter((u) => u.departmentId === departmentId).length;

  useEffect(() => {
    if (departmentId) {
      getDepartmentPagePermissions(departmentId).then(setValues);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleDepartmentChange(id: string) {
    setDepartmentId(id);
    setMessage(null);
    if (id) {
      setValues(await getDepartmentPagePermissions(id));
    } else {
      setValues(null);
    }
  }

  function rows() {
    return PERMISSION_PAGE_KEYS.map(({ pageKey }) => ({ pageKey, permission: values![pageKey] }));
  }

  async function handleSaveTemplate() {
    if (!values) return;
    setIsSaving(true);
    const result = await saveDepartmentTemplate(departmentId, rows());
    setIsSaving(false);
    setMessage(result.success ? "テンプレートを保存しました。" : result.error);
  }

  async function handleApply() {
    if (!values) return;
    setIsApplying(true);
    const result = await applyDepartmentTemplateToMembers(departmentId, rows());
    setIsApplying(false);
    setMessage(result.success ? `${selectedDepartment?.name}の全メンバーに適用しました。` : result.error);
  }

  if (departments.length === 0) {
    return <p className="text-sm text-neutral-600">部署が登録されていません。先に部署を作成してください。</p>;
  }

  return (
    <div className="rounded-lg border border-neutral-200 bg-neutral-0 p-6">
      <label className="flex flex-col gap-1">
        <span className="text-xs text-neutral-600">部署</span>
        <select
          value={departmentId}
          onChange={(e) => handleDepartmentChange(e.target.value)}
          className="w-48 rounded-md border border-neutral-200 bg-neutral-0 px-3 py-2 text-sm text-neutral-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
        >
          {departments.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
      </label>

      {values && (
        <div className="mt-4">
          <PermissionMatrix
            values={values}
            onChange={(pageKey, permission) => setValues((prev) => ({ ...prev!, [pageKey]: permission }))}
          />
          {message && <p className="mt-2 text-sm text-neutral-600">{message}</p>}
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              disabled={isSaving}
              onClick={handleSaveTemplate}
              className="rounded-md border border-neutral-200 px-4 py-2 text-sm text-neutral-600 hover:bg-page-bg disabled:opacity-40"
            >
              テンプレートを保存
            </button>
            <button
              type="button"
              disabled={isApplying}
              onClick={handleApply}
              className="rounded-md bg-primary-500 px-4 py-2 text-sm text-neutral-0 disabled:opacity-40"
            >
              {selectedDepartment?.name}の全メンバー({memberCount}名)に適用
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
