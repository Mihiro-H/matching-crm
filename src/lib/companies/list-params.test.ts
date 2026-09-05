import { describe, expect, test } from "vitest";
import { nextSortDirection, parseCompaniesListParams } from "./list-params";

describe("parseCompaniesListParams", () => {
  test("defaults to sorting by name ascending with no filters", () => {
    expect(parseCompaniesListParams({})).toEqual({
      sortBy: "name",
      sortDir: "asc",
      nameFilter: null,
    });
  });

  test("accepts a valid sortBy and sortDir", () => {
    expect(parseCompaniesListParams({ sort: "industry", dir: "desc" })).toEqual({
      sortBy: "industry",
      sortDir: "desc",
      nameFilter: null,
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

  test("accepts a company name text filter", () => {
    expect(parseCompaniesListParams({ name: "テスト" })).toMatchObject({ nameFilter: "テスト" });
  });
});

describe("nextSortDirection", () => {
  test("flips to desc when clicking the column already sorted ascending", () => {
    expect(nextSortDirection({ sortBy: "name", sortDir: "asc" }, "name")).toBe("desc");
  });

  test("flips to asc when clicking the column already sorted descending", () => {
    expect(nextSortDirection({ sortBy: "name", sortDir: "desc" }, "name")).toBe("asc");
  });

  test("defaults to asc when clicking a different column", () => {
    expect(nextSortDirection({ sortBy: "name", sortDir: "desc" }, "industry")).toBe("asc");
  });
});
