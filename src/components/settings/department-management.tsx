"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createDepartment } from "@/lib/settings/permission-actions";
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
          <li key={d.id} className="text-sm text-neutral-900">
            {d.name}
          </li>
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
