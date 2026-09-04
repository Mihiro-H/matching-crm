import { describe, expect, test } from "vitest";
import { matchCompanyByFolderName } from "./match-company";

const companies = [
  { id: "c1", name: "テスト株式会社" },
  { id: "c2", name: "サンプル商事" },
];

describe("matchCompanyByFolderName", () => {
  test("matches a folder name that exactly equals a company name", () => {
    expect(matchCompanyByFolderName("テスト株式会社", companies)).toBe("c1");
  });

  test("trims surrounding whitespace before matching", () => {
    expect(matchCompanyByFolderName("  サンプル商事  ", companies)).toBe("c2");
  });

  test("returns null when no company matches (left for manual follow-up rather than guessing)", () => {
    expect(matchCompanyByFolderName("知らない会社", companies)).toBeNull();
  });

  test("does not partially match a substring of a company name", () => {
    expect(matchCompanyByFolderName("テスト", companies)).toBeNull();
  });
});
