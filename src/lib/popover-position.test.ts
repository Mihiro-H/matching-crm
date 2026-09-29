import { describe, expect, test } from "vitest";
import { POPOVER_GAP, POPOVER_VIEWPORT_MARGIN, computePopoverPosition } from "./popover-position";

const anchor = { left: 100, bottom: 50 };

describe("computePopoverPosition", () => {
  test("places the popover just below the anchor, aligned to its left edge", () => {
    expect(computePopoverPosition(anchor, { width: 200 }, 1280)).toEqual({
      top: 50 + POPOVER_GAP,
      left: 100,
    });
  });

  test("shifts left so the popover does not overflow the right edge of the viewport", () => {
    const position = computePopoverPosition({ left: 1200, bottom: 50 }, { width: 200 }, 1280);
    expect(position.left).toBe(1280 - 200 - POPOVER_VIEWPORT_MARGIN);
  });

  test("keeps the margin from the left edge even when the viewport is narrower than the popover", () => {
    const position = computePopoverPosition({ left: 10, bottom: 50 }, { width: 400 }, 300);
    expect(position.left).toBe(POPOVER_VIEWPORT_MARGIN);
  });

  test("keeps the anchor's left position when the popover exactly fits", () => {
    const position = computePopoverPosition(
      { left: 1280 - 200 - POPOVER_VIEWPORT_MARGIN, bottom: 50 },
      { width: 200 },
      1280
    );
    expect(position.left).toBe(1280 - 200 - POPOVER_VIEWPORT_MARGIN);
  });
});
