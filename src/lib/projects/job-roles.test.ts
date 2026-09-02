import { describe, expect, test } from "vitest";
import { filterUnassignedFreelancers } from "./job-roles";

describe("filterUnassignedFreelancers", () => {
  test("excludes candidates already assigned to the role", () => {
    const result = filterUnassignedFreelancers(
      ["f1", "f2"],
      [
        { id: "f1", label: "田中太郎", sublabel: null },
        { id: "f2", label: "鈴木花子", sublabel: null },
        { id: "f3", label: "佐藤次郎", sublabel: null },
      ]
    );
    expect(result).toEqual([{ id: "f3", label: "佐藤次郎", sublabel: null }]);
  });

  test("returns all candidates when none are already assigned", () => {
    const candidates = [{ id: "f1", label: "田中太郎", sublabel: null }];
    expect(filterUnassignedFreelancers([], candidates)).toEqual(candidates);
  });

  test("returns an empty array when every candidate is already assigned", () => {
    const candidates = [{ id: "f1", label: "田中太郎", sublabel: null }];
    expect(filterUnassignedFreelancers(["f1"], candidates)).toEqual([]);
  });
});
