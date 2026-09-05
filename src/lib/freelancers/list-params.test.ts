import { describe, expect, test } from "vitest";
import { nextSortDirection, parseFreelancersListParams } from "./list-params";

describe("parseFreelancersListParams", () => {
  test("defaults to sorting by name ascending, no filters", () => {
    expect(parseFreelancersListParams({})).toEqual({
      sortBy: "name",
      sortDir: "asc",
      jobCategoryFilter: null,
      platformFreelancerIdFilter: null,
      nameFilter: null,
      emailFilter: null,
    });
  });

  test("accepts a valid sortBy and sortDir", () => {
    expect(parseFreelancersListParams({ sort: "active_project_count", dir: "desc" })).toMatchObject({
      sortBy: "active_project_count",
      sortDir: "desc",
    });
  });

  test("falls back to defaults for an unrecognized sortBy", () => {
    expect(parseFreelancersListParams({ sort: "not_a_column" })).toMatchObject({ sortBy: "name" });
  });

  test("falls back to asc for an unrecognized sortDir", () => {
    expect(parseFreelancersListParams({ dir: "sideways" })).toMatchObject({ sortDir: "asc" });
  });

  test("accepts a valid job category filter", () => {
    expect(parseFreelancersListParams({ jobCategory: "designer" })).toMatchObject({
      jobCategoryFilter: "designer",
    });
  });

  test("ignores an invalid job category filter", () => {
    expect(parseFreelancersListParams({ jobCategory: "not_a_category" })).toMatchObject({
      jobCategoryFilter: null,
    });
  });

  test("accepts text filters", () => {
    expect(
      parseFreelancersListParams({ platformFreelancerId: "F-1", name: "田中", email: "a@example.com" })
    ).toMatchObject({
      platformFreelancerIdFilter: "F-1",
      nameFilter: "田中",
      emailFilter: "a@example.com",
    });
  });
});

describe("nextSortDirection", () => {
  test("flips to desc when clicking the column already sorted ascending", () => {
    expect(nextSortDirection({ sortBy: "name", sortDir: "asc" }, "name")).toBe("desc");
  });

  test("defaults to asc when clicking a different column", () => {
    expect(nextSortDirection({ sortBy: "name", sortDir: "asc" }, "email")).toBe("asc");
  });
});
