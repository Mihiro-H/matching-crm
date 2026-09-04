"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateProjectDetails } from "@/lib/projects/actions";
import { PROJECT_STATUS_META } from "@/lib/status-badges";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatCurrencyJPY, formatDateJa } from "@/lib/format";
import { PROJECT_STATUS_ORDER } from "@/lib/projects/status-transitions";
import type { ProjectDetail } from "@/lib/projects/get-project";
import type { ProjectStatus } from "@/lib/supabase/database.types";

/** 案件詳細ヘッダー: 基本項目の表示+編集(SCREEN_SPEC.md 4章)。 */
export function ProjectInfoSection({ project, canEdit }: { project: ProjectDetail; canEdit: boolean }) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState(project.title);
  const [budget, setBudget] = useState(project.budget !== null ? String(project.budget) : "");
  const [startDate, setStartDate] = useState(project.start_date ?? "");
  const [endDate, setEndDate] = useState(project.end_date ?? "");
  const [status, setStatus] = useState<ProjectStatus>(project.status);

  // 「契約済」への手動変更はクラウドサインWebhook専用(status-transitions.ts参照)。
  // 既に契約済の案件はそのまま選択肢に残し、他の値からは選べないようにする。
  const statusOptions = PROJECT_STATUS_ORDER.filter(
    (s) => s !== "contracted" || project.status === "contracted"
  );

  function handleCancel() {
    setTitle(project.title);
    setBudget(project.budget !== null ? String(project.budget) : "");
    setStartDate(project.start_date ?? "");
    setEndDate(project.end_date ?? "");
    setStatus(project.status);
    setError(null);
    setIsEditing(false);
  }

  async function handleSave() {
    setError(null);
    setIsSubmitting(true);
    const result = await updateProjectDetails(project.id, {
      title,
      budget: budget.trim() ? Number(budget) : null,
      startDate: startDate || null,
      endDate: endDate || null,
      status,
    });
    setIsSubmitting(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    setIsEditing(false);
    router.refresh();
  }

  if (!isEditing) {
    return (
      <div className="rounded-lg border border-neutral-200 bg-neutral-0 p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-neutral-600">{project.companyName}</p>
            <h2 className="mt-1 text-lg text-neutral-900">{project.title}</h2>
          </div>
          <div className="flex items-center gap-3">
            <StatusBadge meta={PROJECT_STATUS_META[project.status]} />
            {canEdit && (
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="rounded-md border border-neutral-200 px-3 py-1.5 text-sm text-neutral-600 hover:bg-page-bg"
              >
                編集
              </button>
            )}
          </div>
        </div>
        <dl className="mt-4 flex gap-6 text-sm">
          <div>
            <dt className="text-xs text-neutral-600">予算</dt>
            <dd className="text-neutral-900">
              {project.budget !== null ? formatCurrencyJPY(project.budget) : "-"}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-neutral-600">期間</dt>
            <dd className="text-neutral-900">
              {project.start_date || project.end_date
                ? `${project.start_date ? formatDateJa(project.start_date) : "-"} 〜 ${
                    project.end_date ? formatDateJa(project.end_date) : "-"
                  }`
                : "-"}
            </dd>
          </div>
        </dl>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-neutral-200 bg-neutral-0 p-6">
      <p className="text-xs text-neutral-600">{project.companyName}</p>
      {error && <p className="mt-2 text-sm text-danger-text">{error}</p>}
      <div className="mt-3 grid grid-cols-2 gap-4">
        <label className="col-span-2 flex flex-col gap-1">
          <span className="text-xs text-neutral-600">案件名</span>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="rounded-md border border-neutral-200 bg-neutral-0 px-3 py-2 text-sm text-neutral-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-neutral-600">予算</span>
          <input
            type="number"
            min={0}
            value={budget}
            onChange={(e) => setBudget(e.target.value)}
            className="rounded-md border border-neutral-200 bg-neutral-0 px-3 py-2 text-sm text-neutral-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-neutral-600">ステータス</span>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as ProjectStatus)}
            className="rounded-md border border-neutral-200 bg-neutral-0 px-3 py-2 text-sm text-neutral-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
          >
            {statusOptions.map((s) => (
              <option key={s} value={s}>
                {PROJECT_STATUS_META[s].label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-neutral-600">開始日</span>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="rounded-md border border-neutral-200 bg-neutral-0 px-3 py-2 text-sm text-neutral-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-neutral-600">終了日</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="rounded-md border border-neutral-200 bg-neutral-0 px-3 py-2 text-sm text-neutral-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
          />
        </label>
      </div>
      <div className="mt-4 flex gap-2">
        <button
          type="button"
          disabled={isSubmitting}
          onClick={handleSave}
          className="rounded-md bg-primary-500 px-4 py-2 text-sm text-neutral-0 disabled:opacity-40"
        >
          保存
        </button>
        <button
          type="button"
          disabled={isSubmitting}
          onClick={handleCancel}
          className="rounded-md border border-neutral-200 px-4 py-2 text-sm text-neutral-600 hover:bg-page-bg disabled:opacity-40"
        >
          キャンセル
        </button>
      </div>
    </div>
  );
}
