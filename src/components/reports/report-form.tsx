"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { usePageBreadcrumbs } from "@/components/layout/page-header-context";
import { saveReport } from "@/lib/reports/actions";
import { REPORT_METRIC_OPTIONS, REPORT_MESSAGE_TEMPLATE_PLACEHOLDERS, type ReportMetricKey } from "@/lib/reports/metrics";
import type { ReportDetail } from "@/lib/reports/get-report";
import type { ReportFrequency } from "@/lib/supabase/database.types";

const WEEKDAY_LABELS = ["日", "月", "火", "水", "木", "金", "土"];

export function ReportForm({ existing }: { existing: ReportDetail | null }) {
  const router = useRouter();
  usePageBreadcrumbs([
    { label: "レポート", href: "/reports" },
    { label: existing ? existing.name : "新規作成" },
  ]);

  const [name, setName] = useState(existing?.name ?? "");
  const [metrics, setMetrics] = useState<Set<ReportMetricKey>>(new Set(existing?.metrics ?? []));
  const [frequency, setFrequency] = useState<ReportFrequency>(existing?.schedule?.frequency ?? "weekly");
  const [dayOfWeek, setDayOfWeek] = useState(existing?.schedule?.day_of_week ?? 1);
  const [dayOfMonth, setDayOfMonth] = useState(existing?.schedule?.day_of_month ?? 1);
  const [timeOfDay, setTimeOfDay] = useState(existing?.schedule?.time_of_day?.slice(0, 5) ?? "09:00");
  const [slackChannelId, setSlackChannelId] = useState(existing?.schedule?.slack_channel_id ?? "");
  const [messageTemplate, setMessageTemplate] = useState(existing?.schedule?.message_template ?? "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleMetric(key: ReportMetricKey) {
    setMetrics((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  async function handleSave() {
    setError(null);
    if (!name.trim()) {
      setError("レポート名を入力してください。");
      return;
    }
    if (metrics.size === 0) {
      setError("含める項目を1つ以上選択してください。");
      return;
    }
    setIsSubmitting(true);
    const result = await saveReport({
      reportId: existing?.id ?? null,
      name: name.trim(),
      metrics: Array.from(metrics),
      frequency,
      dayOfWeek: frequency === "weekly" ? dayOfWeek : null,
      dayOfMonth: frequency === "monthly" ? dayOfMonth : null,
      timeOfDay: `${timeOfDay}:00`,
      slackChannelId,
      messageTemplate,
    });
    setIsSubmitting(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    router.push(`/reports/${result.id}`);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-lg border border-neutral-200 bg-neutral-0 p-6">
        {error && <p className="mb-3 text-sm text-danger-text">{error}</p>}

        <label className="flex flex-col gap-1">
          <span className="text-xs text-neutral-600">レポート名</span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-80 rounded-md border border-neutral-200 bg-neutral-0 px-3 py-2 text-sm text-neutral-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
          />
        </label>

        <div className="mt-4">
          <p className="text-xs text-neutral-600">含める項目</p>
          <div className="mt-1 flex flex-col gap-1">
            {REPORT_METRIC_OPTIONS.map((option) => (
              <label key={option.key} className="flex items-center gap-2 text-sm text-neutral-900">
                <input
                  type="checkbox"
                  checked={metrics.has(option.key)}
                  onChange={() => toggleMetric(option.key)}
                  className="h-4 w-4 accent-primary-500"
                />
                {option.label}
              </label>
            ))}
          </div>
        </div>

        <div className="mt-4">
          <p className="text-xs text-neutral-600">定期実行</p>
          <div className="mt-1 flex gap-2">
            {(["weekly", "monthly"] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFrequency(f)}
                className={`rounded-full px-3 py-1 text-sm ${
                  frequency === f
                    ? "bg-primary-500 text-neutral-0"
                    : "border border-neutral-200 text-neutral-600 hover:bg-page-bg"
                }`}
              >
                {f === "weekly" ? "週次" : "月次"}
              </button>
            ))}
          </div>

          <div className="mt-2 flex items-end gap-2">
            {frequency === "weekly" ? (
              <label className="flex flex-col gap-1">
                <span className="text-xs text-neutral-600">曜日</span>
                <select
                  value={dayOfWeek}
                  onChange={(e) => setDayOfWeek(Number(e.target.value))}
                  className="rounded-md border border-neutral-200 bg-neutral-0 px-3 py-2 text-sm text-neutral-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
                >
                  {WEEKDAY_LABELS.map((label, i) => (
                    <option key={i} value={i}>
                      {label}曜日
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <label className="flex flex-col gap-1">
                <span className="text-xs text-neutral-600">日(月末を超える場合は末日扱い)</span>
                <input
                  type="number"
                  min={1}
                  max={31}
                  value={dayOfMonth}
                  onChange={(e) => setDayOfMonth(Number(e.target.value))}
                  className="w-20 rounded-md border border-neutral-200 bg-neutral-0 px-3 py-2 text-sm text-neutral-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
                />
              </label>
            )}
            <label className="flex flex-col gap-1">
              <span className="text-xs text-neutral-600">時刻</span>
              <input
                type="time"
                value={timeOfDay}
                onChange={(e) => setTimeOfDay(e.target.value)}
                className="rounded-md border border-neutral-200 bg-neutral-0 px-3 py-2 text-sm text-neutral-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
              />
            </label>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-xs text-neutral-600">Slack通知先チャンネルID</span>
            <input
              type="text"
              value={slackChannelId}
              onChange={(e) => setSlackChannelId(e.target.value)}
              placeholder="#sales-report"
              className="w-64 rounded-md border border-neutral-200 bg-neutral-0 px-3 py-2 text-sm text-neutral-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-neutral-600">
              通知文面(利用可能なプレースホルダー: {REPORT_MESSAGE_TEMPLATE_PLACEHOLDERS.join(" ")})
            </span>
            <textarea
              value={messageTemplate}
              onChange={(e) => setMessageTemplate(e.target.value)}
              rows={3}
              className="rounded-md border border-neutral-200 bg-neutral-0 px-3 py-2 text-sm text-neutral-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
            />
          </label>
        </div>

        <button
          type="button"
          disabled={isSubmitting}
          onClick={handleSave}
          className="mt-6 rounded-md bg-primary-500 px-4 py-2 text-sm text-neutral-0 disabled:opacity-40"
        >
          保存
        </button>
      </div>
    </div>
  );
}
