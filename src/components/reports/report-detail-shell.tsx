"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { key: "edit", label: "編集" },
  { key: "runs", label: "実行履歴" },
] as const;

export function ReportDetailShell({
  reportId,
  children,
}: {
  reportId: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="flex flex-col gap-4">
      <nav className="flex gap-1 border-b border-neutral-100">
        {TABS.map((tab) => {
          const href = `/reports/${reportId}/${tab.key}`;
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
