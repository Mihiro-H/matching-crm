"use client";

import { useState } from "react";
import {
  NOTIFICATION_EVENT_TYPES,
  type NotificationSettingRow,
} from "@/lib/settings/notification-event-types";
import { saveNotificationSetting } from "@/lib/settings/notification-actions";

export function NotificationSettingsTab({ initial }: { initial: NotificationSettingRow[] }) {
  const [settings, setSettings] = useState(initial);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function updateRow(eventType: string, patch: Partial<NotificationSettingRow>) {
    setSettings((prev) => prev.map((row) => (row.eventType === eventType ? { ...row, ...patch } : row)));
  }

  async function handleSave(row: NotificationSettingRow) {
    setSavingKey(row.eventType);
    setErrors((prev) => ({ ...prev, [row.eventType]: "" }));
    const result = await saveNotificationSetting({
      eventType: row.eventType,
      slackChannelId: row.slackChannelId,
      messageTemplate: row.messageTemplate,
      isActive: row.isActive,
    });
    setSavingKey(null);
    if (!result.success) {
      setErrors((prev) => ({ ...prev, [row.eventType]: result.error }));
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {NOTIFICATION_EVENT_TYPES.map((eventDef) => {
        const row = settings.find((s) => s.eventType === eventDef.key)!;
        return (
          <div key={eventDef.key} className="rounded-lg border border-neutral-200 bg-neutral-0 p-6">
            <div className="flex items-center justify-between">
              <h3 className="text-md text-neutral-900">{eventDef.label}</h3>
              <label className="flex items-center gap-2 text-sm text-neutral-600">
                <input
                  type="checkbox"
                  checked={row.isActive}
                  onChange={(e) => updateRow(eventDef.key, { isActive: e.target.checked })}
                  className="h-4 w-4 accent-primary-500"
                />
                有効
              </label>
            </div>

            {errors[eventDef.key] && <p className="mt-2 text-sm text-danger-text">{errors[eventDef.key]}</p>}

            <div className="mt-3 flex flex-col gap-3">
              <label className="flex flex-col gap-1">
                <span className="text-xs text-neutral-600">Slack通知先チャンネルID</span>
                <input
                  type="text"
                  value={row.slackChannelId}
                  onChange={(e) => updateRow(eventDef.key, { slackChannelId: e.target.value })}
                  className="w-64 rounded-md border border-neutral-200 bg-neutral-0 px-3 py-2 text-sm text-neutral-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs text-neutral-600">
                  通知文面(利用可能なプレースホルダー: {eventDef.placeholders.join(" ")})
                </span>
                <textarea
                  value={row.messageTemplate}
                  onChange={(e) => updateRow(eventDef.key, { messageTemplate: e.target.value })}
                  rows={2}
                  className="rounded-md border border-neutral-200 bg-neutral-0 px-3 py-2 text-sm text-neutral-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
                />
              </label>
            </div>

            <button
              type="button"
              disabled={savingKey === eventDef.key}
              onClick={() => handleSave(row)}
              className="mt-3 rounded-md bg-primary-500 px-4 py-2 text-sm text-neutral-0 disabled:opacity-40"
            >
              保存
            </button>
          </div>
        );
      })}
    </div>
  );
}
