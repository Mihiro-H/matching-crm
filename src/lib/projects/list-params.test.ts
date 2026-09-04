import { describe, expect, test } from "vitest";
import { nextSortDirection, parseProjectsListParams } from "./list-params";

describe("parseProjectsListParams", () => {
  test("defaults to table view, sorted by endDate ascending, no filters", () => {
    expect(parseProjectsListParams({})).toEqual({
      view: "table",
      sortBy: "endDate",
      sortDir: "asc",
      statusFilter: null,
      companyNameFilter: null,
      titleFilter: null,
      assigneeFilter: null,
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

  test("accepts a company name text filter", () => {
    expect(parseProjectsListParams({ companyName: "テスト" })).toMatchObject({
      companyNameFilter: "テスト",
    });
  });

  test("accepts a title text filter", () => {
    expect(parseProjectsListParams({ title: "リニューアル" })).toMatchObject({
      titleFilter: "リニューアル",
    });
  });

  test("accepts an assignee filter only when both id and name are present", () => {
    expect(parseProjectsListParams({ assigneeId: "u1", assigneeName: "田中太郎" })).toMatchObject({
      assigneeFilter: { id: "u1", name: "田中太郎" },
    });
    expect(parseProjectsListParams({ assigneeId: "u1" })).toMatchObject({ assigneeFilter: null });
    expect(parseProjectsListParams({ assigneeName: "田中太郎" })).toMatchObject({ assigneeFilter: null });
  });
});

describe("nextSortDirection", () => {
  test("flips direction when clicking the currently sorted column", () => {
    expect(nextSortDirection({ sortBy: "title", sortDir: "asc" }, "title")).toBe("desc");
  });

  test("defaults to asc when clicking a different column", () => {
    expect(nextSortDirection({ sortBy: "title", sortDir: "desc" }, "endDate")).toBe("asc");
  });
});
