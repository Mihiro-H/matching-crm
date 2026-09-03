import { describe, expect, test } from "vitest";
import { renderNotificationTitle } from "./render-title";

describe("renderNotificationTitle", () => {
  test("renders a new_lead title", () => {
    expect(renderNotificationTitle("new_lead", { company_name: "テスト株式会社" })).toBe(
      "新規問い合わせ: テスト株式会社"
    );
  });

  test("renders a contract_signed title", () => {
    expect(
      renderNotificationTitle("contract_signed", {
        company_name: "テスト株式会社",
        project_title: "LP制作",
      })
    ).toBe("契約締結: テスト株式会社 / LP制作");
  });

  test("renders a payment_confirmed title", () => {
    expect(
      renderNotificationTitle("payment_confirmed", {
        company_name: "テスト株式会社",
        project_title: "LP制作",
        amount: "¥300,000",
      })
    ).toBe("入金確認: テスト株式会社 / LP制作 (¥300,000)");
  });

  test("renders a reminder title", () => {
    expect(
      renderNotificationTitle("reminder", { company_name: "テスト株式会社", project_title: "LP制作" })
    ).toBe("リマインド: テスト株式会社 / LP制作");
  });

  test("leaves an unknown placeholder untouched rather than blanking it", () => {
    expect(renderNotificationTitle("new_lead", {})).toBe("新規問い合わせ: {{company_name}}");
  });
});
