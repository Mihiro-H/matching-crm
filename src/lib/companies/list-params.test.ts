import { describe, expect, test } from "vitest";
import { nextSortDirection, parseCompaniesListParams } from "./list-params";

describe("parseCompaniesListParams", () => {
  test("defaults to sorting by name ascending with no filters", () => {
    expect(parseCompaniesListParams({})).toEqual({
      sortBy: "name",
      sortDir: "asc",
      statusFilter: null,
      nameFilter: null,
      assigneeFilter: null,
    });
  });

  test("accepts a valid sortBy and sortDir", () => {
    expect(parseCompaniesListParams({ sort: "status", dir: "desc" })).toEqual({
      sortBy: "status",
      sortDir: "desc",
      statusFilter: null,
      nameFilter: null,
      assigneeFilter: null,
    });
  });

  test("falls back to defaults for an unrecognized sortBy", () => {
    expect(parseCompaniesListParams({ sort: "not_a_column" })).toMatchObject({
      sortBy: "name",
    });
  });

  test("falls back to asc for an unrecognized sortDir", () => {
    expect(parseCompaniesListParams({ dir: "sideways" })).toMatchObject({
      sortDir: "asc",
    });
  });

  test("accepts a valid status filter", () => {
    expect(parseCompaniesListParams({ status: "active" })).toMatchObject({
      statusFilter: "active",
    });
  });

  test("ignores an invalid status filter", () => {
    expect(parseCompaniesListParams({ status: "not_a_status" })).toMatchObject({
      statusFilter: null,
    });
  });

  test("accepts a company name text filter", () => {
    expect(parseCompaniesListParams({ name: "テスト" })).toMatchObject({ nameFilter: "テスト" });
  });

  test("accepts an assignee filter only when both id and name are present", () => {
    expect(parseCompaniesListParams({ assigneeId: "u1", assigneeName: "田中太郎" })).toMatchObject({
      assigneeFilter: { id: "u1", name: "田中太郎" },
    });
    expect(parseCompaniesListParams({ assigneeId: "u1" })).toMatchObject({ assigneeFilter: null });
  });
});

describe("nextSortDirection", () => {
  test("flips to desc when clicking the column already sorted ascending", () => {
    expect(
      nextSortDirection({ sortBy: "name", sortDir: "asc" }, "name")
    ).toBe("desc");
  });

  test("flips to asc when clicking the column already sorted descending", () => {
    expect(
      nextSortDirection({ sortBy: "name", sortDir: "desc" }, "name")
    ).toBe("asc");
  });

  test("defaults to asc when clicking a different column", () => {
    expect(
      nextSortDirection({ sortBy: "name", sortDir: "desc" }, "status")
    ).toBe("asc");
  });
});
