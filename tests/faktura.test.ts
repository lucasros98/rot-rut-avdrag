import { describe, expect, it } from "vitest";
import { valideraFaktura } from "../src/faktura";

const VALID_BASE = {
  arbetskostnad: 10_000,
  begartBelopp: 3_000,
  kopareCpr: "199001011234",
  utforareOrgnr: "556677-8899",
  datumUtfortArbete: "2026-04-15",
};

describe("valideraFaktura — RUT", () => {
  it("godkänner en komplett RUT-faktura", () => {
    expect(valideraFaktura({ ...VALID_BASE, typ: "RUT" })).toEqual([]);
  });

  it("kräver inte fastighetsbeteckning för RUT", () => {
    const fel = valideraFaktura({ ...VALID_BASE, typ: "RUT" });
    expect(fel.find(f => f.falt === "fastighetsbeteckning")).toBeUndefined();
  });
});

describe("valideraFaktura — ROT", () => {
  it("godkänner ROT med fastighetsbeteckning", () => {
    expect(
      valideraFaktura({
        ...VALID_BASE,
        typ: "ROT",
        fastighetsbeteckning: "STOCKHOLM SKARPNÄCKS GÅRD 1:14",
      }),
    ).toEqual([]);
  });

  it("godkänner ROT med BRF-data", () => {
    expect(
      valideraFaktura({
        ...VALID_BASE,
        typ: "ROT",
        bostadsrattLagenhetsnr: "1101",
        bostadsrattForeningOrgnr: "769600-1234",
      }),
    ).toEqual([]);
  });

  it("kräver fastighet eller BRF för ROT", () => {
    const fel = valideraFaktura({ ...VALID_BASE, typ: "ROT" });
    expect(fel.some(f => f.falt === "fastighetsbeteckning")).toBe(true);
  });
});

describe("valideraFaktura — fält", () => {
  it("flaggar ogiltigt personnummer", () => {
    const fel = valideraFaktura({ ...VALID_BASE, typ: "RUT", kopareCpr: "abc" });
    expect(fel.some(f => f.falt === "kopareCpr")).toBe(true);
  });

  it("flaggar ogiltigt orgnummer", () => {
    const fel = valideraFaktura({ ...VALID_BASE, typ: "RUT", utforareOrgnr: "12345" });
    expect(fel.some(f => f.falt === "utforareOrgnr")).toBe(true);
  });

  it("flaggar begärt belopp > arbetskostnad", () => {
    const fel = valideraFaktura({
      ...VALID_BASE,
      typ: "RUT",
      arbetskostnad: 1000,
      begartBelopp: 1500,
    });
    expect(fel.some(f => f.falt === "begartBelopp")).toBe(true);
  });

  it("flaggar ogiltigt datum", () => {
    const fel = valideraFaktura({
      ...VALID_BASE,
      typ: "RUT",
      datumUtfortArbete: "inte-ett-datum",
    });
    expect(fel.some(f => f.falt === "datumUtfortArbete")).toBe(true);
  });
});
