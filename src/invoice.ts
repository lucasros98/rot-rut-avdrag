import type { DeductionKind } from "./types";

/**
 * Fields required on a ROT/RUT invoice and in the request for payment to
 * Skatteverket. Based on form SKV 4528 (Begäran om utbetalning för rot- och
 * rutarbete).
 *
 * Field names mirror the form 1:1 in Swedish where Skatteverket's terminology
 * has no clean English equivalent (e.g. `fastighetsbeteckning`).
 */
export interface InvoiceInput {
  kind: DeductionKind;
  /** Customer's personnummer (YYYYMMDD-XXXX or 12 digits). */
  buyerPersonnummer: string;
  /** Contractor's organisationsnummer (10 digits, dash optional). */
  contractorOrgnummer: string;
  /** Labor cost in SEK (positive). */
  laborCost: number;
  /** Requested deduction amount in SEK. */
  requestedAmount: number;
  /**
   * Fastighetsbeteckning (Swedish real-estate designation, for ROT on a
   * single-family home), OR apartment number + BRF orgnummer (for ROT in a
   * cooperative apartment). Not required for RUT.
   */
  fastighetsbeteckning?: string;
  brfApartmentNumber?: string;
  brfOrgnummer?: string;
  /** Date the work was performed (or the period). */
  workDate: string;
}

export interface InvoiceValidationError {
  field: string;
  message: string;
}

/**
 * Validates that a ROT/RUT invoice contains the fields Skatteverket requires.
 * Returns a list of errors — empty list means valid.
 *
 * This is **field validation**, not deduction calculation. Use
 * `calculateDeduction` for amounts, then combine with this to produce a
 * complete invoice line.
 */
export function validateInvoice(input: InvoiceInput): InvoiceValidationError[] {
  const errors: InvoiceValidationError[] = [];

  if (!isValidPersonnummerFormat(input.buyerPersonnummer)) {
    errors.push({
      field: "buyerPersonnummer",
      message: "Invalid personnummer format",
    });
  }
  if (!isValidOrgnummerFormat(input.contractorOrgnummer)) {
    errors.push({
      field: "contractorOrgnummer",
      message: "Invalid organisationsnummer format",
    });
  }
  if (!(input.laborCost > 0)) {
    errors.push({ field: "laborCost", message: "laborCost must be > 0" });
  }
  if (!(input.requestedAmount > 0)) {
    errors.push({ field: "requestedAmount", message: "requestedAmount must be > 0" });
  }
  if (input.requestedAmount > input.laborCost) {
    errors.push({
      field: "requestedAmount",
      message: "requestedAmount must not exceed laborCost",
    });
  }
  if (!input.workDate || isNaN(Date.parse(input.workDate))) {
    errors.push({ field: "workDate", message: "Invalid date" });
  }

  if (input.kind === "ROT") {
    const hasProperty = !!input.fastighetsbeteckning;
    const hasBrf = !!input.brfApartmentNumber && !!input.brfOrgnummer;
    if (!hasProperty && !hasBrf) {
      errors.push({
        field: "fastighetsbeteckning",
        message:
          "ROT requires either fastighetsbeteckning, or (brfApartmentNumber + brfOrgnummer)",
      });
    }
    if (input.brfApartmentNumber && !isValidOrgnummerFormat(input.brfOrgnummer ?? "")) {
      errors.push({
        field: "brfOrgnummer",
        message: "Invalid orgnummer for the cooperative",
      });
    }
  }

  return errors;
}

/**
 * Loose format validation of a Swedish personnummer (10 or 12 digits with
 * optional dash/plus). Does NOT validate the Luhn checksum — combine with
 * the `personnummer` package if you need that.
 */
function isValidPersonnummerFormat(s: string): boolean {
  return /^(\d{2})?\d{6}[-+]?\d{4}$/.test(s);
}

/**
 * Loose format validation of a Swedish organisationsnummer (10 digits with
 * optional dash). Does NOT validate Luhn — use the `organisationsnummer`
 * package for that.
 */
function isValidOrgnummerFormat(s: string): boolean {
  return /^\d{6}-?\d{4}$/.test(s);
}
