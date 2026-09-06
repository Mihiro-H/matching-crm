"use client";

import { useState } from "react";
import { updateOrganizationProfile } from "@/lib/settings/organization-actions";
import type { OrganizationProfile } from "@/lib/settings/organization-profile";

/**
 * 設定 > 会社情報。公開問い合わせフォーム(/contact/[number])の右上に表示する
 * 会社名・ロゴ画像を設定する(form-editor.tsxの公開URL案内と対になる設定)。
 * ロゴはアップロードではなく画像URLの入力方式(自社サイト等で既に公開済みの画像を想定)。
 */
export function OrganizationSettingsTab({ initial }: { initial: OrganizationProfile }) {
  const [companyName, setCompanyName] = useState(initial.companyName ?? "");
  const [logoUrl, setLogoUrl] = useState(initial.logoUrl ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [imageError, setImageError] = useState(false);

  async function handleSave() {
    setIsSaving(true);
    setMessage(null);
    const result = await updateOrganizationProfile(companyName, logoUrl);
    setIsSaving(false);
    setMessage(result.success ? "保存しました。" : result.error);
  }

  return (
    <div className="rounded-lg border border-neutral-200 bg-neutral-0 p-6">
      <h3 className="text-md text-neutral-900">会社情報</h3>
      <p className="mt-1 text-xs text-neutral-600">
        ここで設定した会社名・ロゴは、公開問い合わせフォーム(/contact/…)のフォーム名右側に表示されます。
        未設定の場合は、CRM左サイドバー上部と同じロゴがデフォルトで表示されます。
      </p>

      <div className="mt-4 flex flex-col gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-xs text-neutral-600">会社名</span>
          <input
            type="text"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            placeholder="株式会社〇〇"
            className="w-80 rounded-md border border-neutral-200 bg-neutral-0 px-3 py-2 text-sm text-neutral-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-neutral-600">ロゴ画像URL</span>
          <input
            type="text"
            value={logoUrl}
            onChange={(e) => {
              setLogoUrl(e.target.value);
              setImageError(false);
            }}
            placeholder="https://example.com/logo.png"
            className="w-96 rounded-md border border-neutral-200 bg-neutral-0 px-3 py-2 text-sm text-neutral-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
          />
          <span className="text-xs text-neutral-400">自社サイト等で既に公開されているロゴ画像のURLを入力してください。</span>
        </label>

        {logoUrl && (
          <div>
            <span className="text-xs text-neutral-600">プレビュー</span>
            <div className="mt-1 flex h-16 items-center rounded-md border border-neutral-100 bg-page-bg px-3">
              {imageError ? (
                <span className="text-xs text-danger-text">画像を読み込めませんでした。URLをご確認ください。</span>
              ) : (
                // eslint-disable-next-line @next/next/no-img-element -- 外部URLの画像プレビューのため
                <img
                  src={logoUrl}
                  alt="ロゴプレビュー"
                  className="h-10 max-w-full object-contain"
                  onError={() => setImageError(true)}
                />
              )}
            </div>
          </div>
        )}

        {message && <p className="text-sm text-neutral-600">{message}</p>}

        <button
          type="button"
          disabled={isSaving}
          onClick={handleSave}
          className="self-start rounded-md bg-primary-500 px-4 py-2 text-sm text-neutral-0 disabled:opacity-40"
        >
          保存
        </button>
      </div>
    </div>
  );
}
