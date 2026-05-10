/**
 * Deduction kind — ROT or RUT.
 *
 * - **ROT** (Reparation, Ombyggnad, Tillbyggnad): work on the owned residence.
 * - **RUT** (Rengöring, Underhåll, Tvätt): household-near services.
 *
 * The acronyms remain in Swedish because they are statutory terms.
 */
export type DeductionKind = "ROT" | "RUT";

export interface Person {
  /** Stable identifier used to keep persons apart. Not a personnummer. */
  id: string;
  /**
   * Amount the person has already used during the current year, split per
   * deduction kind. Default to 0. Source: own bookkeeping or Skatteverket
   * "Mina sidor".
   */
  alreadyUsed?: {
    rot?: number;
    rut?: number;
  };
}

export interface CalculationInput {
  /** Which deduction this calculation is for. */
  kind: DeductionKind;
  /**
   * Labor cost in SEK (excl. or incl. VAT — be consistent, see README).
   * Only labor counts: material, travel and equipment are not deductible.
   */
  laborCost: number;
  /**
   * Persons that share the deduction (one or more owners/residents). The
   * deduction is split evenly unless `split` is provided.
   */
  persons: Person[];
  /**
   * Optional weighting between persons (must sum to 1.0).
   * Default: even split.
   * @example { "p1": 0.6, "p2": 0.4 }
   */
  split?: Record<string, number>;
  /**
   * Tax year — selects which caps and percentages to use. Default: current
   * calendar year. Only 2026 is fully verified in v0.1; other years fall
   * back and emit a warning in `warnings`.
   */
  year?: number;
}

export interface PerPersonResult {
  id: string;
  /** The person's share of the labor cost (SEK). */
  allocatedLaborCost: number;
  /** Deduction *before* caps are applied (SEK, always >= 0). */
  requestedDeduction: number;
  /** Final deduction for the person after all caps (SEK). */
  grantedDeduction: number;
  /**
   * How much was lost to the cap. Useful for explaining to the customer
   * why the full deduction was not granted.
   */
  lostToCap: number;
  /** Remaining headroom for this person after this calculation (SEK). */
  remainingHeadroom: {
    rot: number;
    rut: number;
    /** Combined remaining headroom (ROT + RUT). */
    total: number;
  };
}

export interface CalculationResult {
  /** Total deduction the contractor can request from Skatteverket. */
  totalDeduction: number;
  /** What the customer pays after the deduction (laborCost − totalDeduction). */
  customerPayment: number;
  /** Per-person breakdown of how the deduction was distributed. */
  perPerson: PerPersonResult[];
  /**
   * Soft warnings that are not errors but the client may want to surface.
   * E.g. "Person X exceeded their cap".
   */
  warnings: string[];
  /** The year the calculation was performed against. */
  year: number;
}

export interface YearRules {
  /** ROT deduction rate (0.30 = 30%). */
  rotRate: number;
  /** RUT deduction rate (0.50 = 50%). */
  rutRate: number;
  /** Maximum ROT deduction per person per year (SEK). */
  rotMaxPerPerson: number;
  /** Maximum combined ROT + RUT deduction per person per year (SEK). */
  totalMaxPerPerson: number;
}
