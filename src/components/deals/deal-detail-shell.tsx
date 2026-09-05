"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { usePageBreadcrumbs } from "@/components/layout/page-header-context";
import { DealInfoSection } from "./deal-info-section";
import { DealDetailActions } from "./deal-detail-actions";
import { DealFormAnswers } from "./deal-form-answers";
import type { DealDetail, DealFormAnswer } from "@/lib/deals/get-deal";

const TABS = [{ key: "meeting-notes", label: "関連議事録" }] as const;

export function DealDetailShell({
  dealId,
  deal,
  formAnswers,
  canEdit,
  children,
}: {
  dealId: string;
  deal: DealDetail;
  formAnswers: DealFormAnswer[];
  canEdit: boolean;
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  usePageBreadcrumbs([{ label: "商談管理", href: "/deals" }, { label: deal.personName }]);

  return (
    <div className="flex flex-col gap-4">
      <DealInfoSection deal={deal} canEdit={canEdit} />
      <DealFormAnswers answers={formAnswers} />
      <DealDetailActions deal={deal} canEdit={canEdit} />

      <nav className="flex gap-1 border-b border-neutral-100">
        {TABS.map((tab) => {
          const href = `/deals/${dealId}/${tab.key}`;
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
