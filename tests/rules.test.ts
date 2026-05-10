import { describe, expect, it } from "vitest";
import { RULES_BY_YEAR, getRulesForYear } from "../src/rules";

describe("RULES_BY_YEAR", () => {
  it("has verified 2026 values", () => {
    expect(RULES_BY_YEAR[2026]).toEqual({
      rotRate: 0.3,
      rutRate: 0.5,
      rotMaxPerPerson: 50_000,
      totalMaxPerPerson: 75_000,
    });
  });
});

describe("getRulesForYear", () => {
  it("returns an exact match with verified=true", () => {
    const r = getRulesForYear(2026);
    expect(r.verified).toBe(true);
    expect(r.resolvedYear).toBe(2026);
  });

  it("falls back to the latest verified year for unknown years", () => {
    const r = getRulesForYear(2099);
    expect(r.verified).toBe(false);
    expect(r.resolvedYear).toBe(2026);
  });
});
