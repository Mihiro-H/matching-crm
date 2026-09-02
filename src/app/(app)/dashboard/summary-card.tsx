import type { LucideIcon } from "lucide-react";

export function SummaryCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: LucideIcon;
}) {
  return (
    <div className="flex items-start justify-between rounded-lg border border-neutral-200 bg-neutral-0 p-6">
      <div>
        <p className="text-sm text-neutral-600">{label}</p>
        <p className="mt-2 text-2xl text-neutral-900">{value}</p>
      </div>
      <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary-50 text-primary-600">
        <Icon size={18} />
      </span>
    </div>
  );
}
