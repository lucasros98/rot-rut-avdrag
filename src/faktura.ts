import type { Avdragstyp } from "./types";

/**
 * Fält som krävs på en ROT/RUT-faktura och i begäran om utbetalning till
 * Skatteverket. Baserat på Skatteverkets blankett SKV 4528 (begäran om
 * utbetalning för rot- och rutarbete).
 */
export interface FakturaInput {
  typ: Avdragstyp;
  /** Kundens personnummer (ÅÅÅÅMMDD-XXXX eller 12 siffror). */
  kopareCpr: string;
  /** Utförarens organisationsnummer (10 siffror, valfritt med bindestreck). */
  utforareOrgnr: string;
  /** Arbetskostnad i kronor (positiv). */
  arbetskostnad: number;
  /** Begärt avdragsbelopp i kronor. */
  begartBelopp: number;
  /**
   * Fastighetsbeteckning (för ROT på småhus) ELLER lägenhetsnummer + bostads-
   * rättsföreningens orgnr (för ROT i bostadsrätt). Krävs inte för RUT.
   */
  fastighetsbeteckning?: string;
  bostadsrattLagenhetsnr?: string;
  bostadsrattForeningOrgnr?: string;
  /** Datum då arbetet utfördes (eller perioden). */
  datumUtfortArbete: string;
}

export interface FakturaValideringsfel {
  falt: string;
  meddelande: string;
}

/**
 * Validerar att en ROT/RUT-faktura har de fält som Skatteverket kräver.
 * Returnerar en lista med fel — tom lista = giltig.
 *
 * Detta är **fält-validering**, inte beräkning av avdraget. Använd
 * `beraknaAvdrag` för själva beloppen och kombinera med detta för att
 * generera korrekt fakturarad.
 */
export function valideraFaktura(input: FakturaInput): FakturaValideringsfel[] {
  const fel: FakturaValideringsfel[] = [];

  if (!arGiltigtPersonnummer(input.kopareCpr)) {
    fel.push({ falt: "kopareCpr", meddelande: "Ogiltigt personnummer-format" });
  }
  if (!arGiltigtOrgnummer(input.utforareOrgnr)) {
    fel.push({ falt: "utforareOrgnr", meddelande: "Ogiltigt organisationsnummer-format" });
  }
  if (!(input.arbetskostnad > 0)) {
    fel.push({ falt: "arbetskostnad", meddelande: "Arbetskostnad måste vara > 0" });
  }
  if (!(input.begartBelopp > 0)) {
    fel.push({ falt: "begartBelopp", meddelande: "Begärt belopp måste vara > 0" });
  }
  if (input.begartBelopp > input.arbetskostnad) {
    fel.push({
      falt: "begartBelopp",
      meddelande: "Begärt belopp får inte överstiga arbetskostnaden",
    });
  }
  if (!input.datumUtfortArbete || isNaN(Date.parse(input.datumUtfortArbete))) {
    fel.push({ falt: "datumUtfortArbete", meddelande: "Ogiltigt datum" });
  }

  if (input.typ === "ROT") {
    const harFastighet = !!input.fastighetsbeteckning;
    const harBrf =
      !!input.bostadsrattLagenhetsnr && !!input.bostadsrattForeningOrgnr;
    if (!harFastighet && !harBrf) {
      fel.push({
        falt: "fastighetsbeteckning",
        meddelande:
          "ROT kräver antingen fastighetsbeteckning eller (lägenhetsnummer + BRF-orgnr)",
      });
    }
    if (
      input.bostadsrattLagenhetsnr &&
      !arGiltigtOrgnummer(input.bostadsrattForeningOrgnr ?? "")
    ) {
      fel.push({
        falt: "bostadsrattForeningOrgnr",
        meddelande: "Ogiltigt orgnummer för bostadsrättsförening",
      });
    }
  }

  return fel;
}

/**
 * Lös format-validering av svenskt personnummer (10 eller 12 siffror med
 * valfri bindestreck/plus). Validerar inte Luhn-checksumman — kombinera
 * med t.ex. `personnummer`-paketet om du vill det.
 */
function arGiltigtPersonnummer(s: string): boolean {
  return /^(\d{2})?\d{6}[-+]?\d{4}$/.test(s);
}

/**
 * Lös format-validering av svenskt organisationsnummer (10 siffror med
 * valfri bindestreck). Validerar inte Luhn — använd `organisationsnummer`-
 * paketet för det.
 */
function arGiltigtOrgnummer(s: string): boolean {
  return /^\d{6}-?\d{4}$/.test(s);
}
