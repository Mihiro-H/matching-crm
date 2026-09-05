"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { createDepartment, deleteDepartment, updateDepartment } from "@/lib/settings/permission-actions";
import type { Department } from "@/lib/settings/get-permissions";

export function DepartmentManagement({ departments }: { departments: Department[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    const result = await createDepartment(name);
    setIsSubmitting(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    setName("");
    router.refresh();
  }

  return (
    <div className="rounded-lg border border-neutral-200 bg-neutral-0 p-6">
      <h3 className="text-md text-neutral-900">部署管理</h3>
      <ul className="mt-3 flex flex-col gap-1">
        {departments.map((d) => (
          <DepartmentRow key={d.id} department={d} onChanged={() => router.refresh()} />
        ))}
        {departments.length === 0 && <li className="text-sm text-neutral-600">部署はまだありません。</li>}
      </ul>

      <form onSubmit={handleSubmit} className="mt-4 flex items-end gap-2">
        {error && <p className="text-sm text-danger-text">{error}</p>}
        <label className="flex flex-col gap-1">
          <span className="text-xs text-neutral-600">新しい部署名</span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-48 rounded-md border border-neutral-200 bg-neutral-0 px-3 py-2 text-sm text-neutral-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
          />
        </label>
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-md bg-primary-500 px-4 py-2 text-sm text-neutral-0 disabled:opacity-40"
        >
          追加
        </button>
      </form>
    </div>
  );
}

function DepartmentRow({ department, onChanged }: { department: Department; onChanged: () => void }) {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(department.name);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleCancel() {
    setName(department.name);
    setError(null);
    setIsEditing(false);
  }

  async function handleSave() {
    setError(null);
    setIsSubmitting(true);
    const result = await updateDepartment(department.id, name);
    setIsSubmitting(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    setIsEditing(false);
    onChanged();
  }

  async function handleDelete() {
    setError(null);
    setIsSubmitting(true);
    const result = await deleteDepartment(department.id);
    setIsSubmitting(false);
    if (!result.success) {
      setError(result.error);
      setShowDeleteConfirm(false);
      return;
    }
    onChanged();
  }

  return (
    <li className="flex items-center gap-2 text-sm text-neutral-900">
      {isEditing ? (
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-48 rounded-md border border-neutral-200 bg-neutral-0 px-2 py-1 text-sm text-neutral-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
        />
      ) : (
        <span>{department.name}</span>
      )}

      {isEditing ? (
        <>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={handleSave}
            className="text-xs text-primary-600 hover:underline disabled:opacity-40"
          >
            保存
          </button>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={handleCancel}
            className="text-xs text-neutral-600 hover:underline disabled:opacity-40"
          >
            キャンセル
          </button>
        </>
      ) : (
        <>
          <button type="button" onClick={() => setIsEditing(true)} className="text-xs text-primary-600 hover:underline">
            編集
          </button>
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            className="text-xs text-danger-text hover:underline"
          >
            削除
          </button>
        </>
      )}
      {error && <p className="text-xs text-danger-text">{error}</p>}

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        title="部署を削除しますか?"
        message={`「${department.name}」を削除します。所属していたユーザーは部署未設定になります。`}
        confirmLabel="削除する"
        cancelLabel="キャンセル"
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </li>
  );
}
