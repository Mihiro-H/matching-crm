"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function ReportDetailShell({ reportId, children }: { reportId: string; children: React.ReactNode }) {
  const pathname = usePathname();

  const tabs = [
    { href: `/reports/${reportId}`, label: "表示" },
    { href: `/reports/${reportId}/edit`, label: "編集" },
    { href: `/reports/${reportId}/runs`, label: "実行履歴" },
  ];

  return (
    <div className="flex flex-col gap-4">
      <nav className="flex gap-1 border-b border-neutral-100">
        {tabs.map((tab) => {
          const isActive = pathname === tab.href;
          return (
            <Link
              key={tab.href}
              href={tab.href}
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
