import { describe, it, expect } from "vitest";
import { parseRejectionDetails } from "./plansData";

describe("parseRejectionDetails", () => {
  it("defaults to ALL when rejectionReason is undefined or empty", () => {
    expect(parseRejectionDetails(undefined)).toEqual({
      scope: "ALL",
      rejectedActivityRefs: [],
      cleanRemarks: "",
    });

    expect(parseRejectionDetails("")).toEqual({
      scope: "ALL",
      rejectedActivityRefs: [],
      cleanRemarks: "",
    });
  });

  it("parses plain unstructured rejection remarks as ALL scope", () => {
    const result = parseRejectionDetails(
      "The entire procurement plan budget exceeds annual ceiling.",
    );
    expect(result).toEqual({
      scope: "ALL",
      rejectedActivityRefs: [],
      cleanRemarks:
        "The entire procurement plan budget exceeds annual ceiling.",
    });
  });

  it("extracts SPECIFIC scope and activity references from structured tagged remarks", () => {
    const raw =
      "[Flagged Activities: BREFONS-G-001, BREFONS-W-002] Equipment specifications are outdated and delivery timeline is not feasible.";
    const result = parseRejectionDetails(raw);
    expect(result.scope).toBe("SPECIFIC");
    expect(result.rejectedActivityRefs).toEqual([
      "BREFONS-G-001",
      "BREFONS-W-002",
    ]);
    expect(result.cleanRemarks).toBe(
      "Equipment specifications are outdated and delivery timeline is not feasible.",
    );
  });
});
