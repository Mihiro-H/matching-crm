"use client";

import { useState } from "react";
import { usePageBreadcrumbs } from "@/components/layout/page-header-context";
import { toggleMeetingNoteActionItem } from "@/lib/meeting-notes/actions";
import type { ActionItem } from "@/lib/meeting-notes/action-items";

export function ActionItemsChecklist({
  meetingNoteId,
  title,
  initialItems,
}: {
  meetingNoteId: string;
  title: string;
  initialItems: ActionItem[];
}) {
  const [items, setItems] = useState(initialItems);
  const [error, setError] = useState<string | null>(null);

  usePageBreadcrumbs([{ label: "議事録", href: "/meeting-notes" }, { label: title }]);

  async function handleToggle(index: number) {
    setError(null);
    const previous = items;
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, done: !item.done } : item)));

    const result = await toggleMeetingNoteActionItem(meetingNoteId, index);
    if (!result.success) {
      setError(result.error);
      setItems(previous);
    }
  }

  if (items.length === 0) {
    return <p className="text-sm text-neutral-600">アクションアイテムはありません。</p>;
  }

  return (
    <div>
      {error && <p className="mb-2 text-sm text-danger-text">{error}</p>}
      <ul className="flex flex-col gap-2">
        {items.map((item, index) => (
          <li key={index}>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={item.done}
                onChange={() => handleToggle(index)}
                className="h-4 w-4 accent-primary-500"
              />
              <span className={item.done ? "text-neutral-400 line-through" : "text-neutral-900"}>
                {item.text}
              </span>
            </label>
          </li>
        ))}
      </ul>
    </div>
  );
}
