import { describe, expect, it } from "vitest";
import { ARS_REGLER, reglerForAr } from "../src/regler";

describe("ARS_REGLER", () => {
  it("har verifierade 2026-värden", () => {
    expect(ARS_REGLER[2026]).toEqual({
      rotProcent: 0.3,
      rutProcent: 0.5,
      rotMaxPerPerson: 50_000,
      totalMaxPerPerson: 75_000,
    });
  });
});

describe("reglerForAr", () => {
  it("returnerar exakt match med verifierat=true", () => {
    const r = reglerForAr(2026);
    expect(r.verifierat).toBe(true);
    expect(r.anvantAr).toBe(2026);
  });

  it("faller tillbaka till senaste verifierat år för okända år", () => {
    const r = reglerForAr(2099);
    expect(r.verifierat).toBe(false);
    expect(r.anvantAr).toBe(2026);
  });
});
