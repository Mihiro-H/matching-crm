"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import {
  markAllNotificationsRead,
  markNotificationRead,
  type NotificationItem,
} from "@/lib/notifications/actions";
import { formatDateTimeJa } from "@/lib/format";

/**
 * ヘッダーのベルアイコン(SCREEN_SPEC.md「共通レイアウト」)。
 * 初期データはサーバー側(AppLayout)で取得したものをpropsで受け取り、
 * 既読操作はクライアント側で楽観的に反映する(サーバーへの反映はServer Action経由)。
 */
export function NotificationBell({
  initialItems,
  initialUnreadCount,
}: {
  initialItems: NotificationItem[];
  initialUnreadCount: number;
}) {
  const [items, setItems] = useState(initialItems);
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  function handleItemClick(item: NotificationItem) {
    if (item.isRead) return;
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, isRead: true } : i)));
    setUnreadCount((prev) => Math.max(0, prev - 1));
    void markNotificationRead(item.id);
  }

  function handleMarkAllRead() {
    if (unreadCount === 0) return;
    setItems((prev) => prev.map((i) => ({ ...i, isRead: true })));
    setUnreadCount(0);
    void markAllNotificationsRead();
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-label="通知"
        onClick={() => setIsOpen((prev) => !prev)}
        className="relative rounded-full p-2 text-neutral-600 hover:bg-page-bg"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-warning-text" />
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full z-20 mt-2 w-80 rounded-lg border border-neutral-200 bg-neutral-0 shadow-md">
          <div className="flex items-center justify-between border-b border-neutral-100 px-4 py-3">
            <span className="text-sm text-neutral-900">通知</span>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="text-xs text-primary-600 hover:underline"
              >
                すべて既読にする
              </button>
            )}
          </div>

          <ul className="max-h-96 overflow-y-auto">
            {items.length === 0 && (
              <li className="px-4 py-6 text-center text-sm text-neutral-600">通知はありません。</li>
            )}
            {items.map((item) => {
              const content = (
                <>
                  <p className={`text-sm ${item.isRead ? "text-neutral-600" : "text-neutral-900"}`}>
                    {item.title}
                  </p>
                  <p className="mt-1 text-xs text-neutral-400">{formatDateTimeJa(item.createdAt)}</p>
                </>
              );
              const className = `block border-b border-neutral-100 px-4 py-3 last:border-0 hover:bg-page-bg ${
                item.isRead ? "" : "bg-primary-50"
              }`;

              return (
                <li key={item.id}>
                  {item.linkPath ? (
                    <Link href={item.linkPath} onClick={() => handleItemClick(item)} className={className}>
                      {content}
                    </Link>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleItemClick(item)}
                      className={`w-full text-left ${className}`}
                    >
                      {content}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
