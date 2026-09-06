"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { usePageBreadcrumbs } from "@/components/layout/page-header-context";
import { createForm } from "@/lib/forms/actions";

/** フォーム管理「+新規作成」。 */
export function FormCreateForm() {
  const router = useRouter();
  usePageBreadcrumbs([{ label: "フォーム管理", href: "/forms" }, { label: "新規作成" }]);

  const [name, setName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError("フォーム名を入力してください。");
      return;
    }
    setIsSubmitting(true);
    const result = await createForm(name);
    setIsSubmitting(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    router.push(`/forms/${result.number}`);
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border border-neutral-200 bg-neutral-0 p-6">
      {error && <p className="mb-3 text-sm text-danger-text">{error}</p>}
      <label className="flex flex-col gap-1">
        <span className="text-xs text-neutral-600">フォーム名</span>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="お問い合わせフォーム"
          className="w-80 rounded-md border border-neutral-200 bg-neutral-0 px-3 py-2 text-sm text-neutral-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
        />
      </label>
      <p className="mt-2 text-xs text-neutral-400">
        氏名・メール・電話番号・企業名・依頼職種・問い合わせ内容の初期項目が入った状態で作成されます。作成後、項目の追加・編集・並べ替えができます。
      </p>
      <button
        type="submit"
        disabled={isSubmitting}
        className="mt-4 rounded-md bg-primary-500 px-4 py-2 text-sm text-neutral-0 disabled:opacity-40"
      >
        登録
      </button>
    </form>
  );
}
