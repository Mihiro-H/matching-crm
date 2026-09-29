// 起点(ボタン)とポップオーバーの間の隙間(px)。
export const POPOVER_GAP = 4;
// ポップオーバーを画面端にぴったり付けないための余白(px)。
export const POPOVER_VIEWPORT_MARGIN = 8;

/**
 * position: fixed で表示するポップオーバーの座標を、起点要素の位置から計算する。
 * スクロールするテーブルの中に置いたポップオーバーは枠で切れてしまうため、
 * document.bodyへポータルして画面座標で配置する(その際に画面右端からはみ出さないよう左へずらす)。
 */
export function computePopoverPosition(
  anchorRect: { left: number; bottom: number },
  popoverSize: { width: number },
  viewportWidth: number
): { top: number; left: number } {
  const maxLeft = viewportWidth - popoverSize.width - POPOVER_VIEWPORT_MARGIN;
  return {
    top: anchorRect.bottom + POPOVER_GAP,
    left: Math.max(POPOVER_VIEWPORT_MARGIN, Math.min(anchorRect.left, maxLeft)),
  };
}
