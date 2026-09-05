"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/meeting-notes", label: "議事録一覧" },
  { href: "/meeting-notes/upload", label: "アップロード" },
] as const;

export function MeetingNotesTabs() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-1 border-b border-neutral-100">
      {TABS.map((tab) => {
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
  );
}
