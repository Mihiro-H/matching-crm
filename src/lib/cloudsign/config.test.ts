import { afterEach, describe, expect, test, vi } from "vitest";
import { getCloudSignConfig } from "./config";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("getCloudSignConfig", () => {
  test("returns sandbox config (default) when CLOUDSIGN_ENV is unset", () => {
    vi.stubEnv("CLOUDSIGN_CLIENT_ID", "client-1");
    vi.stubEnv("CLOUDSIGN_TEMPLATE_ID_ESTIMATE", "template-estimate");
    vi.stubEnv("CLOUDSIGN_ENV", undefined);

    expect(getCloudSignConfig("estimate")).toEqual({
      clientId: "client-1",
      env: "sandbox",
      templateId: "template-estimate",
    });
  });

  test("returns production config when CLOUDSIGN_ENV=production", () => {
    vi.stubEnv("CLOUDSIGN_CLIENT_ID", "client-1");
    vi.stubEnv("CLOUDSIGN_TEMPLATE_ID_ORDER", "template-order");
    vi.stubEnv("CLOUDSIGN_ENV", "production");

    expect(getCloudSignConfig("order")).toEqual({
      clientId: "client-1",
      env: "production",
      templateId: "template-order",
    });
  });

  test("returns null when CLOUDSIGN_CLIENT_ID is missing", () => {
    vi.stubEnv("CLOUDSIGN_CLIENT_ID", undefined);
    vi.stubEnv("CLOUDSIGN_TEMPLATE_ID_ESTIMATE", "template-estimate");

    expect(getCloudSignConfig("estimate")).toBeNull();
  });

  test("returns null when the template id for the requested document type is missing", () => {
    vi.stubEnv("CLOUDSIGN_CLIENT_ID", "client-1");
    vi.stubEnv("CLOUDSIGN_TEMPLATE_ID_ESTIMATE", undefined);

    expect(getCloudSignConfig("estimate")).toBeNull();
  });
});
