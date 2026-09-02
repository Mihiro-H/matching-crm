export type ActionItem = { text: string; done: boolean };

/**
 * meeting_notes.action_items(jsonb, DB_SCHEMA.md: `[{ "text": "...", "done": false }]`)を
 * 安全にパースする。壊れたデータ(旧形式・手動編集ミス等)が来ても例外を投げず、
 * 不正なエントリだけを読み飛ばす。
 */
export function parseActionItems(raw: unknown): ActionItem[] {
  if (!Array.isArray(raw)) return [];

  return raw.filter((item): item is ActionItem => {
    return (
      typeof item === "object" &&
      item !== null &&
      typeof (item as ActionItem).text === "string" &&
      typeof (item as ActionItem).done === "boolean"
    );
  });
}

/** 一覧カードの「要タスク化件数バッジ」(SCREEN_SPEC.md 6章) */
export function countPendingActionItems(items: ActionItem[]): number {
  return items.filter((item) => !item.done).length;
}

/** 詳細画面のチェックリストで完了/未完了をトグルする */
export function toggleActionItem(items: ActionItem[], index: number): ActionItem[] {
  if (index < 0 || index >= items.length) return items;
  return items.map((item, i) => (i === index ? { ...item, done: !item.done } : item));
}
