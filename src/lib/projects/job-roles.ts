import type { SearchResultItem } from "@/lib/search-select/actions";

/**
 * フリーランスアサインモーダル(SCREEN_SPEC.md 4章)で、
 * 既にその職種枠にアサイン済みのフリーランスを候補から除外する。
 * (DB上は重複アサインを禁止していないが、同じ枠への二重アサインはUI上避ける)
 */
export function filterUnassignedFreelancers(
  alreadyAssignedIds: string[],
  candidates: SearchResultItem[]
): SearchResultItem[] {
  const assigned = new Set(alreadyAssignedIds);
  return candidates.filter((candidate) => !assigned.has(candidate.id));
}
