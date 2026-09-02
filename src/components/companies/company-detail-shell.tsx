"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { usePageBreadcrumbs } from "@/components/layout/page-header-context";

const TABS = [
  { key: "projects", label: "案件" },
  { key: "estimates", label: "見積・契約" },
  { key: "invoices", label: "請求" },
  { key: "contacts", label: "担当者履歴" },
] as const;

export function CompanyDetailShell({
  companyId,
  companyName,
  children,
}: {
  companyId: string;
  companyName: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  usePageBreadcrumbs([
    { label: "企業一覧", href: "/companies" },
    { label: companyName },
  ]);

  return (
    <div className="flex flex-col gap-4">
      <nav className="flex gap-1 border-b border-neutral-100">
        {TABS.map((tab) => {
          const href = `/companies/${companyId}/${tab.key}`;
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
