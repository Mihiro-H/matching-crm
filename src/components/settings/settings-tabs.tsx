"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { key: "notifications", label: "通知設定" },
  { key: "permissions", label: "権限設定" },
] as const;

export function SettingsTabs() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-1 border-b border-neutral-100">
      {TABS.map((tab) => {
        const href = `/settings/${tab.key}`;
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
  );
}
