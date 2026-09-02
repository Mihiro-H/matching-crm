import { SEMANTIC_STATUS_CLASSES, type StatusMeta } from "@/lib/status-badges";

export function StatusBadge({ meta }: { meta: StatusMeta }) {
  const classes = SEMANTIC_STATUS_CLASSES[meta.semantic];
  return (
    <span
      className={`inline-block rounded-sm px-2 py-1 text-xs ${classes.bg} ${classes.text}`}
    >
      {meta.label}
    </span>
  );
}
