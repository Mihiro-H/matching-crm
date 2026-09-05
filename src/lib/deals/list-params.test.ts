import { describe, expect, test } from "vitest";
import { nextSortDirection, parseDealsListParams } from "./list-params";

describe("parseDealsListParams", () => {
  test("defaults to sorting by created_at descending (newest first), no filters", () => {
    expect(parseDealsListParams({})).toEqual({
      sortBy: "createdAt",
      sortDir: "desc",
      statusFilter: null,
      companyNameFilter: null,
      nameFilter: null,
      assigneeFilter: null,
      page: 1,
    });
  });

  test("accepts a valid page number and falls back to 1 for invalid values", () => {
    expect(parseDealsListParams({ page: "3" })).toMatchObject({ page: 3 });
    expect(parseDealsListParams({ page: "not_a_number" })).toMatchObject({ page: 1 });
  });

  test("accepts a valid sortBy and sortDir", () => {
    expect(parseDealsListParams({ sort: "company", dir: "asc" })).toMatchObject({
      sortBy: "company",
      sortDir: "asc",
    });
  });

  test("falls back to defaults for an unrecognized sortBy", () => {
    expect(parseDealsListParams({ sort: "not_a_column" })).toMatchObject({ sortBy: "createdAt" });
  });

  test("falls back to desc for an unrecognized sortDir", () => {
    expect(parseDealsListParams({ dir: "sideways" })).toMatchObject({ sortDir: "desc" });
  });

  test("accepts a valid status filter, including the newly added on_hold", () => {
    expect(parseDealsListParams({ status: "on_hold" })).toMatchObject({ statusFilter: "on_hold" });
  });

  test("ignores an invalid status filter", () => {
    expect(parseDealsListParams({ status: "not_a_status" })).toMatchObject({ statusFilter: null });
  });

  test("accepts a company name text filter", () => {
    expect(parseDealsListParams({ companyName: "テスト" })).toMatchObject({
      companyNameFilter: "テスト",
    });
  });

  test("accepts a person name text filter", () => {
    expect(parseDealsListParams({ name: "田中" })).toMatchObject({ nameFilter: "田中" });
  });

  test("accepts an assignee filter only when both id and name are present", () => {
    expect(parseDealsListParams({ assigneeId: "u1", assigneeName: "田中太郎" })).toMatchObject({
      assigneeFilter: { id: "u1", name: "田中太郎" },
    });
    expect(parseDealsListParams({ assigneeId: "u1" })).toMatchObject({ assigneeFilter: null });
  });
});

describe("nextSortDirection", () => {
  test("flips to asc when clicking the column already sorted descending", () => {
    expect(nextSortDirection({ sortBy: "createdAt", sortDir: "desc" }, "createdAt")).toBe("asc");
  });

  test("defaults to asc when clicking a different column", () => {
    expect(nextSortDirection({ sortBy: "createdAt", sortDir: "desc" }, "name")).toBe("asc");
  });
});
