"use client";

import { useState } from "react";
import { IndividualPermissionsTab } from "./individual-permissions-tab";
import { DepartmentPermissionsTab } from "./department-permissions-tab";
import type { Department, UserOption } from "@/lib/settings/get-permissions";

// SCREEN_SPEC.md 10章 9-2: 権限設定は role='admin' のみアクセス可。
// admin以外のnotFound()判定は親のsettings/layout.tsx(requireAdminPageAccess)で行う。
// ユーザー管理・部署管理はここには混在させず、/settings/users・/settings/departments
// という別タブに分離している(settings-tabs.tsx参照)。
export function PermissionsPageClient({
  departments,
  users,
}: {
  departments: Department[];
  users: UserOption[];
}) {
  const [subTab, setSubTab] = useState<"individual" | "department">("individual");

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setSubTab("individual")}
          className={`rounded-full px-3 py-1 text-sm ${
            subTab === "individual"
              ? "bg-primary-500 text-neutral-0"
              : "border border-neutral-200 text-neutral-600 hover:bg-page-bg"
          }`}
        >
          個人別
        </button>
        <button
          type="button"
          onClick={() => setSubTab("department")}
          className={`rounded-full px-3 py-1 text-sm ${
            subTab === "department"
              ? "bg-primary-500 text-neutral-0"
              : "border border-neutral-200 text-neutral-600 hover:bg-page-bg"
          }`}
        >
          部署一括
        </button>
      </div>

      {subTab === "individual" ? <IndividualPermissionsTab /> : <DepartmentPermissionsTab departments={departments} users={users} />}
    </div>
  );
}
