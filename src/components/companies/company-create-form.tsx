"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createCompanyDetailed } from "@/lib/companies/actions";
import { usePageBreadcrumbs } from "@/components/layout/page-header-context";

/** 企業一覧「+新規作成」(SCREEN_SPEC.md 3章)。 */
export function CompanyCreateForm() {
  const router = useRouter();
  usePageBreadcrumbs([{ label: "企業一覧", href: "/companies" }, { label: "新規作成" }]);

  const [name, setName] = useState("");
  const [industry, setIndustry] = useState("");
  const [firstContactDate, setFirstContactDate] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError("企業名を入力してください。");
      return;
    }
    setIsSubmitting(true);
    const result = await createCompanyDetailed({
      name,
      industry: industry || null,
      firstContactDate: firstContactDate || null,
    });
    setIsSubmitting(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    router.push(`/companies/${result.id}`);
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border border-neutral-200 bg-neutral-0 p-6">
      {error && <p className="mb-3 text-sm text-danger-text">{error}</p>}
      <div className="grid grid-cols-2 gap-4">
        <label className="flex flex-col gap-1">
          <span className="text-xs text-neutral-600">企業名</span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="rounded-md border border-neutral-200 bg-neutral-0 px-3 py-2 text-sm text-neutral-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-neutral-600">業種</span>
          <input
            type="text"
            value={industry}
            onChange={(e) => setIndustry(e.target.value)}
            className="rounded-md border border-neutral-200 bg-neutral-0 px-3 py-2 text-sm text-neutral-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-neutral-600">初回接触日</span>
          <input
            type="date"
            value={firstContactDate}
            onChange={(e) => setFirstContactDate(e.target.value)}
            className="rounded-md border border-neutral-200 bg-neutral-0 px-3 py-2 text-sm text-neutral-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
          />
        </label>
      </div>
      <button
        type="submit"
        disabled={isSubmitting}
        className="mt-6 rounded-md bg-primary-500 px-4 py-2 text-sm text-neutral-0 disabled:opacity-40"
      >
        登録
      </button>
    </form>
  );
}
