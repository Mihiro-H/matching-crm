import { describe, expect, test } from "vitest";
import { nextSortDirection, parseEstimatesListParams } from "./list-params";

describe("parseEstimatesListParams", () => {
  test("defaults to sorting by created_at descending (newest first), no filters", () => {
    expect(parseEstimatesListParams({})).toEqual({
      sortBy: "created_at",
      sortDir: "desc",
      documentTypeFilter: null,
      companyNameFilter: null,
      projectTitleFilter: null,
    });
  });

  test("accepts a valid sortBy and sortDir", () => {
    expect(parseEstimatesListParams({ sort: "amount", dir: "asc" })).toMatchObject({
      sortBy: "amount",
      sortDir: "asc",
    });
  });

  test("falls back to defaults for an unrecognized sortBy", () => {
    expect(parseEstimatesListParams({ sort: "not_a_column" })).toMatchObject({ sortBy: "created_at" });
  });

  test("falls back to desc for an unrecognized sortDir", () => {
    expect(parseEstimatesListParams({ dir: "sideways" })).toMatchObject({ sortDir: "desc" });
  });

  test("accepts a valid document type filter", () => {
    expect(parseEstimatesListParams({ documentType: "delivery_slip" })).toMatchObject({
      documentTypeFilter: "delivery_slip",
    });
  });

  test("ignores an invalid document type filter", () => {
    expect(parseEstimatesListParams({ documentType: "order" })).toMatchObject({ documentTypeFilter: null });
  });

  test("accepts a company name text filter", () => {
    expect(parseEstimatesListParams({ companyName: "テスト" })).toMatchObject({
      companyNameFilter: "テスト",
    });
  });

  test("accepts a project title text filter", () => {
    expect(parseEstimatesListParams({ projectTitle: "LP制作" })).toMatchObject({
      projectTitleFilter: "LP制作",
    });
  });
});

describe("nextSortDirection", () => {
  test("flips to asc when clicking the column already sorted descending", () => {
    expect(nextSortDirection({ sortBy: "created_at", sortDir: "desc" }, "created_at")).toBe("asc");
  });

  test("defaults to asc when clicking a different column", () => {
    expect(nextSortDirection({ sortBy: "created_at", sortDir: "desc" }, "amount")).toBe("asc");
  });
});
