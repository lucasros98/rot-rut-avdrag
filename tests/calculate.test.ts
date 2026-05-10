import { describe, expect, it } from "vitest";
import { calculateDeduction } from "../src/calculate";

const PERSON_A = { id: "a" };
const PERSON_B = { id: "b" };

describe("calculateDeduction — ROT (30%, max 50 000 per person, total 75 000)", () => {
  it("computes 30% of laborCost for a single person with no prior usage", () => {
    const r = calculateDeduction({
      kind: "ROT",
      laborCost: 10_000,
      persons: [PERSON_A],
      year: 2026,
    });
    expect(r.totalDeduction).toBe(3_000);
    expect(r.customerPayment).toBe(7_000);
    expect(r.perPerson[0].grantedDeduction).toBe(3_000);
    expect(r.perPerson[0].lostToCap).toBe(0);
    expect(r.warnings).toEqual([]);
  });

  it("caps against the per-person ROT limit of 50 000", () => {
    const r = calculateDeduction({
      kind: "ROT",
      laborCost: 200_000,
      persons: [PERSON_A],
      year: 2026,
    });
    expect(r.perPerson[0].requestedDeduction).toBe(60_000);
    expect(r.perPerson[0].grantedDeduction).toBe(50_000);
    expect(r.perPerson[0].lostToCap).toBe(10_000);
    expect(r.warnings.length).toBe(1);
  });

  it("respects already used ROT", () => {
    const r = calculateDeduction({
      kind: "ROT",
      laborCost: 100_000,
      persons: [{ id: "a", alreadyUsed: { rot: 40_000 } }],
      year: 2026,
    });
    expect(r.perPerson[0].grantedDeduction).toBe(10_000);
    expect(r.perPerson[0].lostToCap).toBe(20_000);
    expect(r.perPerson[0].remainingHeadroom.rot).toBe(0);
  });

  it("the ROT cap is overridden by the combined cap when RUT is already used", () => {
    const r = calculateDeduction({
      kind: "ROT",
      laborCost: 200_000,
      persons: [{ id: "a", alreadyUsed: { rut: 40_000 } }],
      year: 2026,
    });
    expect(r.perPerson[0].grantedDeduction).toBe(35_000);
  });

  it("splits the deduction evenly between two persons by default", () => {
    const r = calculateDeduction({
      kind: "ROT",
      laborCost: 20_000,
      persons: [PERSON_A, PERSON_B],
      year: 2026,
    });
    expect(r.totalDeduction).toBe(6_000);
    expect(r.perPerson[0].grantedDeduction).toBe(3_000);
    expect(r.perPerson[1].grantedDeduction).toBe(3_000);
  });

  it("respects a custom split", () => {
    const r = calculateDeduction({
      kind: "ROT",
      laborCost: 20_000,
      persons: [PERSON_A, PERSON_B],
      split: { a: 0.7, b: 0.3 },
      year: 2026,
    });
    expect(r.perPerson[0].grantedDeduction).toBe(20_000 * 0.7 * 0.3);
    expect(r.perPerson[1].grantedDeduction).toBe(20_000 * 0.3 * 0.3);
  });

  it("two persons can together exceed a single per-person cap", () => {
    const r = calculateDeduction({
      kind: "ROT",
      laborCost: 400_000,
      persons: [PERSON_A, PERSON_B],
      year: 2026,
    });
    expect(r.totalDeduction).toBe(100_000);
  });
});

describe("calculateDeduction — RUT (50%, combined cap 75 000)", () => {
  it("computes 50% of laborCost", () => {
    const r = calculateDeduction({
      kind: "RUT",
      laborCost: 10_000,
      persons: [PERSON_A],
      year: 2026,
    });
    expect(r.totalDeduction).toBe(5_000);
  });

  it("caps against the combined limit of 75 000", () => {
    const r = calculateDeduction({
      kind: "RUT",
      laborCost: 200_000,
      persons: [PERSON_A],
      year: 2026,
    });
    expect(r.perPerson[0].grantedDeduction).toBe(75_000);
    expect(r.perPerson[0].lostToCap).toBe(25_000);
  });

  it("RUT is reduced by already used ROT", () => {
    const r = calculateDeduction({
      kind: "RUT",
      laborCost: 200_000,
      persons: [{ id: "a", alreadyUsed: { rot: 50_000 } }],
      year: 2026,
    });
    expect(r.perPerson[0].grantedDeduction).toBe(25_000);
  });

  it("two cohabitants can together claim 2 × 75 000 = 150 000", () => {
    const r = calculateDeduction({
      kind: "RUT",
      laborCost: 400_000,
      persons: [PERSON_A, PERSON_B],
      year: 2026,
    });
    expect(r.totalDeduction).toBe(150_000);
  });
});

describe("validation", () => {
  it("throws on zero laborCost", () => {
    expect(() =>
      calculateDeduction({ kind: "ROT", laborCost: 0, persons: [PERSON_A] }),
    ).toThrow(/laborCost/);
  });

  it("throws on empty persons", () => {
    expect(() =>
      calculateDeduction({ kind: "ROT", laborCost: 1000, persons: [] }),
    ).toThrow(/persons/);
  });

  it("throws on duplicate person ids", () => {
    expect(() =>
      calculateDeduction({
        kind: "ROT",
        laborCost: 1000,
        persons: [{ id: "a" }, { id: "a" }],
      }),
    ).toThrow(/unique/);
  });

  it("throws when split does not sum to 1", () => {
    expect(() =>
      calculateDeduction({
        kind: "ROT",
        laborCost: 1000,
        persons: [PERSON_A, PERSON_B],
        split: { a: 0.5, b: 0.4 },
      }),
    ).toThrow(/sum to 1/);
  });

  it("throws when split is missing a person", () => {
    expect(() =>
      calculateDeduction({
        kind: "ROT",
        laborCost: 1000,
        persons: [PERSON_A, PERSON_B],
        split: { a: 1 },
      }),
    ).toThrow(/missing person/);
  });
});

describe("year handling", () => {
  it("warns and falls back when the year is not verified", () => {
    const r = calculateDeduction({
      kind: "ROT",
      laborCost: 1000,
      persons: [PERSON_A],
      year: 2030,
    });
    expect(r.year).toBe(2026);
    expect(r.warnings.some(w => w.includes("2030"))).toBe(true);
  });
});
