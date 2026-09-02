import { describe, expect, test } from "vitest";
import { nextSortDirection, parseProjectsListParams } from "./list-params";

describe("parseProjectsListParams", () => {
  test("defaults to table view, sorted by deadline ascending, no status filter", () => {
    expect(parseProjectsListParams({})).toEqual({
      view: "table",
      sortBy: "deadline",
      sortDir: "asc",
      statusFilter: null,
    });
  });

  test("accepts a valid view", () => {
    expect(parseProjectsListParams({ view: "kanban" })).toMatchObject({ view: "kanban" });
  });

  test("falls back to table for an unrecognized view", () => {
    expect(parseProjectsListParams({ view: "chart" })).toMatchObject({ view: "table" });
  });

  test("accepts a valid sortBy/sortDir", () => {
    expect(parseProjectsListParams({ sort: "company", dir: "desc" })).toMatchObject({
      sortBy: "company",
      sortDir: "desc",
    });
  });

  test("accepts a valid status filter", () => {
    expect(parseProjectsListParams({ status: "in_progress" })).toMatchObject({
      statusFilter: "in_progress",
    });
  });

  test("ignores an invalid status filter", () => {
    expect(parseProjectsListParams({ status: "not_a_status" })).toMatchObject({
      statusFilter: null,
    });
  });
});

describe("nextSortDirection", () => {
  test("flips direction when clicking the currently sorted column", () => {
    expect(nextSortDirection({ sortBy: "title", sortDir: "asc" }, "title")).toBe("desc");
  });

  test("defaults to asc when clicking a different column", () => {
    expect(nextSortDirection({ sortBy: "title", sortDir: "desc" }, "deadline")).toBe("asc");
  });
});
