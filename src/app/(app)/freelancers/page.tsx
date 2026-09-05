import Link from "next/link";
import { getFreelancers } from "@/lib/freelancers/get-freelancers";
import { parseFreelancersListParams } from "@/lib/freelancers/list-params";
import { FreelancersTable } from "@/components/freelancers/freelancers-table";
import { JOB_CATEGORIES, JOB_CATEGORY_LABELS } from "@/lib/job-categories";
import { CsvImportButton } from "@/components/freelancers/csv-import-button";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { requireAdminPageAccess } from "@/lib/auth/page-access";
import type { JobCategory } from "@/lib/supabase/database.types";

// SCREEN_SPEC.md 9章: 対応職種フィルターのチップ(すべて/ライター/フォトグラファー/マーケター/デザイナー)
const JOB_CATEGORY_FILTER_CHIPS: { label: string; value: JobCategory | null }[] = [
  { label: "すべて", value: null },
  ...JOB_CATEGORIES.map((category) => ({ label: JOB_CATEGORY_LABELS[category], value: category })),
];

// SCREEN_SPEC.md 9章「アクセス制限」: role='admin'以外はURLを直接叩いてもアクセス不可。
export default async function FreelancersPage({
  searchParams,
}: {
  searchParams: Promise<{
    sort?: string;
    dir?: string;
    jobCategory?: string;
    platformFreelancerId?: string;
    name?: string;
    email?: string;
  }>;
}) {
  if (!isSupabaseConfigured()) {
    return <SupabaseNotConfiguredNotice />;
  }

  await requireAdminPageAccess();

  const resolvedParams = await searchParams;
  const params = parseFreelancersListParams(resolvedParams);
  const { freelancers, error } = await getFreelancers(params);

  function chipHref(jobCategory: JobCategory | null) {
    const next = new URLSearchParams();
    next.set("sort", params.sortBy);
    next.set("dir", params.sortDir);
    if (jobCategory) next.set("jobCategory", jobCategory);
    if (params.platformFreelancerIdFilter) next.set("platformFreelancerId", params.platformFreelancerIdFilter);
    if (params.nameFilter) next.set("name", params.nameFilter);
    if (params.emailFilter) next.set("email", params.emailFilter);
    return `/freelancers?${next.toString()}`;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex flex-wrap gap-2">
          {JOB_CATEGORY_FILTER_CHIPS.map((chip) => {
            const isActive = params.jobCategoryFilter === chip.value;
            return (
              <Link
                key={chip.label}
                href={chipHref(chip.value)}
                className={`rounded-full px-3 py-1 text-sm ${
                  isActive
                    ? "bg-primary-500 text-neutral-0"
                    : "border border-neutral-200 text-neutral-600 hover:bg-page-bg"
                }`}
              >
                {chip.label}
              </Link>
            );
          })}
        </div>
        <CsvImportButton />
      </div>

      {error && (
        <div className="rounded-lg border border-danger-bg bg-danger-bg p-4 text-sm text-danger-text">
          一覧の取得に失敗しました: {error}
        </div>
      )}

      {!error && <FreelancersTable freelancers={freelancers} params={params} />}
    </div>
  );
}

function SupabaseNotConfiguredNotice() {
  return (
    <div className="rounded-lg border border-neutral-200 bg-neutral-0 p-8">
      <h2 className="text-lg text-neutral-900">Supabase未接続です</h2>
      <p className="mt-2 text-sm text-neutral-600">
        Supabaseの接続情報を .env に設定すると、一覧が表示されます。
      </p>
    </div>
  );
}
