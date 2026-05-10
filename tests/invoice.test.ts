import { describe, expect, it } from "vitest";
import { validateInvoice } from "../src/invoice";

const VALID_BASE = {
  laborCost: 10_000,
  requestedAmount: 3_000,
  buyerPersonnummer: "199001011234",
  contractorOrgnummer: "556677-8899",
  workDate: "2026-04-15",
};

describe("validateInvoice — RUT", () => {
  it("accepts a complete RUT invoice", () => {
    expect(validateInvoice({ ...VALID_BASE, kind: "RUT" })).toEqual([]);
  });

  it("does not require fastighetsbeteckning for RUT", () => {
    const errs = validateInvoice({ ...VALID_BASE, kind: "RUT" });
    expect(errs.find(e => e.field === "fastighetsbeteckning")).toBeUndefined();
  });
});

describe("validateInvoice — ROT", () => {
  it("accepts ROT with fastighetsbeteckning", () => {
    expect(
      validateInvoice({
        ...VALID_BASE,
        kind: "ROT",
        fastighetsbeteckning: "STOCKHOLM SKARPNÄCKS GÅRD 1:14",
      }),
    ).toEqual([]);
  });

  it("accepts ROT with BRF data", () => {
    expect(
      validateInvoice({
        ...VALID_BASE,
        kind: "ROT",
        brfApartmentNumber: "1101",
        brfOrgnummer: "769600-1234",
      }),
    ).toEqual([]);
  });

  it("requires fastighetsbeteckning or BRF for ROT", () => {
    const errs = validateInvoice({ ...VALID_BASE, kind: "ROT" });
    expect(errs.some(e => e.field === "fastighetsbeteckning")).toBe(true);
  });
});

describe("validateInvoice — fields", () => {
  it("flags invalid personnummer", () => {
    const errs = validateInvoice({ ...VALID_BASE, kind: "RUT", buyerPersonnummer: "abc" });
    expect(errs.some(e => e.field === "buyerPersonnummer")).toBe(true);
  });

  it("flags invalid orgnummer", () => {
    const errs = validateInvoice({ ...VALID_BASE, kind: "RUT", contractorOrgnummer: "12345" });
    expect(errs.some(e => e.field === "contractorOrgnummer")).toBe(true);
  });

  it("flags requestedAmount > laborCost", () => {
    const errs = validateInvoice({
      ...VALID_BASE,
      kind: "RUT",
      laborCost: 1000,
      requestedAmount: 1500,
    });
    expect(errs.some(e => e.field === "requestedAmount")).toBe(true);
  });

  it("flags invalid date", () => {
    const errs = validateInvoice({
      ...VALID_BASE,
      kind: "RUT",
      workDate: "not-a-date",
    });
    expect(errs.some(e => e.field === "workDate")).toBe(true);
  });
});
