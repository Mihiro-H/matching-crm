import { computeNextRunAt, type ScheduleInput } from "./next-run";

const ONE_HOUR_MS = 60 * 60 * 1000;
// Vercel Hobbyプランはcronを1日1回までしか実行できない(要once/day、±59分の
// タイミング精度)ため、cronの実行間隔を「ほぼ24時間おき」とみなし、
// それより広い25時間の窓で「直近に発火時刻があったか」を判定する。
// この結果、report_schedules.time_of_dayで設定した時刻ぴったりには送信されず、
// 実際の送信はcronの実行時刻(vercel.jsonで固定した1日1回の時間帯)付近になる
// (正確なtime_of_day通りの送信が必要ならVercel Proへのアップグレードが必要)。
// frequencyはweekly/monthlyのみ(daily無し)で発生間隔が最短でも7日あるため、
// 25時間程度の窓を使っても同じ回を二重に発火させることはない。
const DEFAULT_WINDOW_MS = 25 * ONE_HOUR_MS;

/**
 * 定期実行cronが、このスケジュールを今回実行すべきかを判定する。
 * 「windowMs前を起点に次回実行日時を計算し、それがnow以前に収まっているか」で
 * 判定することで、同じ発火を2回実行してしまうことを防ぐ
 * (computeNextRunAtは「その時刻を過ぎていれば次の回」に進めるため)。
 */
export function isScheduleDueNow(
  schedule: ScheduleInput,
  now: Date,
  windowMs: number = DEFAULT_WINDOW_MS
): boolean {
  const windowStart = new Date(now.getTime() - windowMs);
  const next = computeNextRunAt(schedule, windowStart);
  return next.getTime() > windowStart.getTime() && next.getTime() <= now.getTime();
}
