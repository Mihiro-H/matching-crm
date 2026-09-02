import { describe, expect, test } from "vitest";
import { isManualDropAllowed } from "./status-transitions";

describe("isManualDropAllowed", () => {
  test("disallows manually dropping a card into 'contracted' (webhook-only transition)", () => {
    expect(isManualDropAllowed("contracted")).toBe(false);
  });

  test("allows manually dropping into any other status, forward or backward", () => {
    expect(isManualDropAllowed("negotiating")).toBe(true);
    expect(isManualDropAllowed("estimate_submitted")).toBe(true);
    expect(isManualDropAllowed("contract_sent")).toBe(true);
    expect(isManualDropAllowed("in_progress")).toBe(true);
    expect(isManualDropAllowed("inspected")).toBe(true);
    expect(isManualDropAllowed("payment_pending")).toBe(true);
    expect(isManualDropAllowed("completed")).toBe(true);
  });
});
