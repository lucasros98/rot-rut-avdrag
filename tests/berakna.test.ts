import { describe, expect, it } from "vitest";
import { beraknaAvdrag } from "../src/berakna";

const PERSON_A = { id: "a" };
const PERSON_B = { id: "b" };

describe("beraknaAvdrag — ROT (30%, max 50 000/person, total 75 000)", () => {
  it("räknar 30% av arbetskostnaden för en person utan tidigare avdrag", () => {
    const r = beraknaAvdrag({
      typ: "ROT",
      arbetskostnad: 10_000,
      personer: [PERSON_A],
      ar: 2026,
    });
    expect(r.totaltAvdrag).toBe(3_000);
    expect(r.kundbetalning).toBe(7_000);
    expect(r.perPerson[0].faktisktAvdrag).toBe(3_000);
    expect(r.perPerson[0].bortfallPgaTak).toBe(0);
    expect(r.varningar).toEqual([]);
  });

  it("kapar mot ROT-taket på 50 000 per person", () => {
    // Arbetskostnad 200 000 → 30% = 60 000 begärt → kapas till 50 000.
    const r = beraknaAvdrag({
      typ: "ROT",
      arbetskostnad: 200_000,
      personer: [PERSON_A],
      ar: 2026,
    });
    expect(r.perPerson[0].begartAvdrag).toBe(60_000);
    expect(r.perPerson[0].faktisktAvdrag).toBe(50_000);
    expect(r.perPerson[0].bortfallPgaTak).toBe(10_000);
    expect(r.varningar.length).toBe(1);
  });

  it("respekterar redan utnyttjat ROT", () => {
    const r = beraknaAvdrag({
      typ: "ROT",
      arbetskostnad: 100_000,
      personer: [{ id: "a", redanUtnyttjat: { rot: 40_000 } }],
      ar: 2026,
    });
    // 30% av 100 000 = 30 000 begärt, men bara 10 000 ROT-utrymme kvar.
    expect(r.perPerson[0].faktisktAvdrag).toBe(10_000);
    expect(r.perPerson[0].bortfallPgaTak).toBe(20_000);
    expect(r.perPerson[0].aterstaendeUtrymme.rot).toBe(0);
  });

  it("ROT-taket bryts av total-taket när RUT redan utnyttjats", () => {
    // Total = 75 000, redan RUT 40 000 → bara 35 000 totalkvar.
    // ROT-taket är 50 000, men totalkvar = 35 000 vinner.
    const r = beraknaAvdrag({
      typ: "ROT",
      arbetskostnad: 200_000,
      personer: [{ id: "a", redanUtnyttjat: { rut: 40_000 } }],
      ar: 2026,
    });
    expect(r.perPerson[0].faktisktAvdrag).toBe(35_000);
  });

  it("delar avdraget jämnt mellan två personer som default", () => {
    const r = beraknaAvdrag({
      typ: "ROT",
      arbetskostnad: 20_000,
      personer: [PERSON_A, PERSON_B],
      ar: 2026,
    });
    // 30% av 20 000 = 6 000, delat jämnt = 3 000 var.
    expect(r.totaltAvdrag).toBe(6_000);
    expect(r.perPerson[0].faktisktAvdrag).toBe(3_000);
    expect(r.perPerson[1].faktisktAvdrag).toBe(3_000);
  });

  it("respekterar custom fördelning", () => {
    const r = beraknaAvdrag({
      typ: "ROT",
      arbetskostnad: 20_000,
      personer: [PERSON_A, PERSON_B],
      fordelning: { a: 0.7, b: 0.3 },
      ar: 2026,
    });
    expect(r.perPerson[0].faktisktAvdrag).toBe(20_000 * 0.7 * 0.3);
    expect(r.perPerson[1].faktisktAvdrag).toBe(20_000 * 0.3 * 0.3);
  });

  it("två personer kan tillsammans få avdrag som överstiger ett enskilt tak", () => {
    // 400 000 arbetskostnad, ROT 30% = 120 000 begärt, två personer = 60 000 var
    // ROT-tak per person = 50 000 → faktiskt 50 000 var = 100 000 totalt.
    const r = beraknaAvdrag({
      typ: "ROT",
      arbetskostnad: 400_000,
      personer: [PERSON_A, PERSON_B],
      ar: 2026,
    });
    expect(r.totaltAvdrag).toBe(100_000);
  });
});

describe("beraknaAvdrag — RUT (50%, totaltak 75 000)", () => {
  it("räknar 50% av arbetskostnaden", () => {
    const r = beraknaAvdrag({
      typ: "RUT",
      arbetskostnad: 10_000,
      personer: [PERSON_A],
      ar: 2026,
    });
    expect(r.totaltAvdrag).toBe(5_000);
  });

  it("kapar mot total-taket 75 000", () => {
    // 50% av 200 000 = 100 000 begärt → kapas till 75 000.
    const r = beraknaAvdrag({
      typ: "RUT",
      arbetskostnad: 200_000,
      personer: [PERSON_A],
      ar: 2026,
    });
    expect(r.perPerson[0].faktisktAvdrag).toBe(75_000);
    expect(r.perPerson[0].bortfallPgaTak).toBe(25_000);
  });

  it("RUT minskas av redan utnyttjat ROT", () => {
    const r = beraknaAvdrag({
      typ: "RUT",
      arbetskostnad: 200_000,
      personer: [{ id: "a", redanUtnyttjat: { rot: 50_000 } }],
      ar: 2026,
    });
    // Totalt utrymme 75 000, redan ROT 50 000 → 25 000 RUT-utrymme kvar.
    expect(r.perPerson[0].faktisktAvdrag).toBe(25_000);
  });

  it("två sambor kan utnyttja 2 × 75 000 = 150 000", () => {
    const r = beraknaAvdrag({
      typ: "RUT",
      arbetskostnad: 400_000,
      personer: [PERSON_A, PERSON_B],
      ar: 2026,
    });
    expect(r.totaltAvdrag).toBe(150_000);
  });
});

describe("validering", () => {
  it("kastar på 0 arbetskostnad", () => {
    expect(() =>
      beraknaAvdrag({ typ: "ROT", arbetskostnad: 0, personer: [PERSON_A] }),
    ).toThrow(/arbetskostnad/);
  });

  it("kastar på tom personer-array", () => {
    expect(() =>
      beraknaAvdrag({ typ: "ROT", arbetskostnad: 1000, personer: [] }),
    ).toThrow(/personer/);
  });

  it("kastar på dubbla person-id", () => {
    expect(() =>
      beraknaAvdrag({
        typ: "ROT",
        arbetskostnad: 1000,
        personer: [{ id: "a" }, { id: "a" }],
      }),
    ).toThrow(/unika/);
  });

  it("kastar om fördelning inte summerar till 1", () => {
    expect(() =>
      beraknaAvdrag({
        typ: "ROT",
        arbetskostnad: 1000,
        personer: [PERSON_A, PERSON_B],
        fordelning: { a: 0.5, b: 0.4 },
      }),
    ).toThrow(/summera till 1/);
  });

  it("kastar om fördelning saknar en person", () => {
    expect(() =>
      beraknaAvdrag({
        typ: "ROT",
        arbetskostnad: 1000,
        personer: [PERSON_A, PERSON_B],
        fordelning: { a: 1 },
      }),
    ).toThrow(/saknar person/);
  });
});

describe("år-hantering", () => {
  it("varnar när året inte är verifierat och faller tillbaka", () => {
    const r = beraknaAvdrag({
      typ: "ROT",
      arbetskostnad: 1000,
      personer: [PERSON_A],
      ar: 2030,
    });
    expect(r.ar).toBe(2026);
    expect(r.varningar.some(v => v.includes("2030"))).toBe(true);
  });
});
