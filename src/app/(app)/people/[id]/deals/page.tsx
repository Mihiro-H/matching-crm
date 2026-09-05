import Link from "next/link";
import { getDealsForPerson } from "@/lib/people/get-person";
import { DEAL_STATUS_META } from "@/lib/status-badges";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatDateJa } from "@/lib/format";

export default async function PersonDealsTab({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { deals, error } = await getDealsForPerson(id);

  if (error) {
    return <p className="text-sm text-danger-text">商談一覧の取得に失敗しました: {error}</p>;
  }

  if (deals.length === 0) {
    return <p className="text-sm text-neutral-600">この担当者の商談はまだありません。</p>;
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-neutral-0">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-neutral-100 text-neutral-600">
            <th className="px-4 py-3 font-medium">ステータス</th>
            <th className="px-4 py-3 font-medium">初回問合せ日</th>
          </tr>
        </thead>
        <tbody>
          {deals.map((deal) => (
            <tr key={deal.id} className="border-b border-neutral-100 last:border-0">
              <td className="px-4 py-3">
                <Link href={`/deals/${deal.number}`} className="inline-block">
                  <StatusBadge meta={DEAL_STATUS_META[deal.status]} />
                </Link>
              </td>
              <td className="px-4 py-3 text-neutral-600">{formatDateJa(deal.createdAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
