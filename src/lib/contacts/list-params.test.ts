import { describe, expect, test } from "vitest";
import { nextSortDirection, parseContactsListParams } from "./list-params";

describe("parseContactsListParams", () => {
  test("defaults to sorting by created_at descending (newest first), no filters", () => {
    expect(parseContactsListParams({})).toEqual({
      sortBy: "createdAt",
      sortDir: "desc",
      statusFilter: null,
      companyNameFilter: null,
      nameFilter: null,
      assigneeFilter: null,
    });
  });

  test("accepts a valid sortBy and sortDir", () => {
    expect(parseContactsListParams({ sort: "company", dir: "asc" })).toMatchObject({
      sortBy: "company",
      sortDir: "asc",
    });
  });

  test("falls back to defaults for an unrecognized sortBy", () => {
    expect(parseContactsListParams({ sort: "not_a_column" })).toMatchObject({ sortBy: "createdAt" });
  });

  test("falls back to desc for an unrecognized sortDir", () => {
    expect(parseContactsListParams({ dir: "sideways" })).toMatchObject({ sortDir: "desc" });
  });

  test("accepts a valid status filter", () => {
    expect(parseContactsListParams({ status: "negotiating" })).toMatchObject({
      statusFilter: "negotiating",
    });
  });

  test("ignores an invalid status filter", () => {
    expect(parseContactsListParams({ status: "not_a_status" })).toMatchObject({ statusFilter: null });
  });

  test("accepts a company name text filter", () => {
    expect(parseContactsListParams({ companyName: "テスト" })).toMatchObject({
      companyNameFilter: "テスト",
    });
  });

  test("accepts a contact name text filter", () => {
    expect(parseContactsListParams({ name: "田中" })).toMatchObject({ nameFilter: "田中" });
  });

  test("accepts an assignee filter only when both id and name are present", () => {
    expect(parseContactsListParams({ assigneeId: "u1", assigneeName: "田中太郎" })).toMatchObject({
      assigneeFilter: { id: "u1", name: "田中太郎" },
    });
    expect(parseContactsListParams({ assigneeId: "u1" })).toMatchObject({ assigneeFilter: null });
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
