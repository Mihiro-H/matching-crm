"use client";

import { PERMISSION_PAGE_KEYS } from "@/lib/settings/permission-pages";
import type { PagePermission } from "@/lib/supabase/database.types";

const OPTIONS: { value: PagePermission; label: string }[] = [
  { value: "edit", label: "編集" },
  { value: "view", label: "閲覧" },
  { value: "hidden", label: "非表示" },
];

export function PermissionMatrix({
  values,
  onChange,
}: {
  values: Record<string, PagePermission>;
  onChange: (pageKey: string, permission: PagePermission) => void;
}) {
  return (
    <table className="w-full text-left text-sm">
      <thead>
        <tr className="border-b border-neutral-100 text-neutral-600">
          <th className="py-2 font-medium">ページ</th>
          <th className="py-2 font-medium">権限</th>
        </tr>
      </thead>
      <tbody>
        {PERMISSION_PAGE_KEYS.map(({ pageKey, label }) => (
          <tr key={pageKey} className="border-b border-neutral-100 last:border-0">
            <td className="py-2 text-neutral-900">{label}</td>
            <td className="py-2">
              <div className="flex gap-1">
                {OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => onChange(pageKey, option.value)}
                    className={`rounded-full px-3 py-1 text-xs ${
                      values[pageKey] === option.value
                        ? "bg-primary-500 text-neutral-0"
                        : "border border-neutral-200 text-neutral-600 hover:bg-page-bg"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
