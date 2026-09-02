import { computeNextRunAt, type ScheduleInput } from "./next-run";

const ONE_HOUR_MS = 60 * 60 * 1000;

/**
 * 定期実行cron(1時間ごとに動く想定)が、このスケジュールを今回実行すべきかを判定する。
 * 「1時間前を起点に次回実行日時を計算し、それが直近1時間以内に収まっているか」で
 * 判定することで、同じ発火を2回実行してしまうことを防ぐ
 * (computeNextRunAtは「その時刻を過ぎていれば次の回」に進めるため)。
 */
export function isScheduleDueNow(
  schedule: ScheduleInput,
  now: Date,
  windowMs: number = ONE_HOUR_MS
): boolean {
  const windowStart = new Date(now.getTime() - windowMs);
  const next = computeNextRunAt(schedule, windowStart);
  return next.getTime() > windowStart.getTime() && next.getTime() <= now.getTime();
}
