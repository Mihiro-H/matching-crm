"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { usePageBreadcrumbs } from "@/components/layout/page-header-context";
import { PersonInfoSection } from "./person-info-section";
import type { PersonDetail } from "@/lib/people/get-person";

const TABS = [{ key: "deals", label: "商談一覧" }] as const;

export function PersonDetailShell({
  personId,
  person,
  canEdit,
  children,
}: {
  personId: string;
  person: PersonDetail;
  canEdit: boolean;
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  usePageBreadcrumbs([{ label: "担当者一覧", href: "/people" }, { label: person.name }]);

  return (
    <div className="flex flex-col gap-4">
      <PersonInfoSection person={person} canEdit={canEdit} />

      <nav className="flex gap-1 border-b border-neutral-100">
        {TABS.map((tab) => {
          const href = `/people/${personId}/${tab.key}`;
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
