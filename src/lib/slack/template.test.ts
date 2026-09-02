import { describe, expect, test } from "vitest";
import { renderMessageTemplate } from "./template";

describe("renderMessageTemplate", () => {
  test("replaces every {{placeholder}} with the matching value", () => {
    expect(
      renderMessageTemplate("{{company_name}}様の案件「{{project_title}}」が成約しました", {
        company_name: "株式会社アクメ商事",
        project_title: "コーポレートサイト制作",
      })
    ).toBe("株式会社アクメ商事様の案件「コーポレートサイト制作」が成約しました");
  });

  test("leaves unknown placeholders untouched", () => {
    expect(renderMessageTemplate("{{amount}}円です", {})).toBe("{{amount}}円です");
  });

  test("replaces every occurrence when the same placeholder appears twice", () => {
    expect(
      renderMessageTemplate("{{name}}さん、{{name}}さん", { name: "田中" })
    ).toBe("田中さん、田中さん");
  });

  test("returns the template unchanged when there are no placeholders", () => {
    expect(renderMessageTemplate("固定文言です", { name: "田中" })).toBe("固定文言です");
  });
});
