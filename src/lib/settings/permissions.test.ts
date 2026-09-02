import { describe, expect, test } from "vitest";
import { buildBulkPermissionUpserts } from "./permissions";

describe("buildBulkPermissionUpserts", () => {
  test("produces one upsert row per (member, page) combination", () => {
    const result = buildBulkPermissionUpserts(
      ["user-1", "user-2"],
      [
        { pageKey: "dashboard", permission: "view" },
        { pageKey: "companies", permission: "edit" },
      ]
    );

    expect(result).toEqual([
      { user_id: "user-1", page_key: "dashboard", permission: "view" },
      { user_id: "user-1", page_key: "companies", permission: "edit" },
      { user_id: "user-2", page_key: "dashboard", permission: "view" },
      { user_id: "user-2", page_key: "companies", permission: "edit" },
    ]);
  });

  test("returns an empty array when there are no members", () => {
    expect(buildBulkPermissionUpserts([], [{ pageKey: "dashboard", permission: "view" }])).toEqual([]);
  });

  test("returns an empty array when there are no template rows", () => {
    expect(buildBulkPermissionUpserts(["user-1"], [])).toEqual([]);
  });
});
