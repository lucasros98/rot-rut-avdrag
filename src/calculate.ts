import { getRulesForYear } from "./rules";
import type {
  CalculationInput,
  CalculationResult,
  DeductionKind,
  PerPersonResult,
  Person,
  YearRules,
} from "./types";

/**
 * Calculates a ROT or RUT deduction for a labor cost shared between one or
 * more persons, respecting each person's individual caps and what they have
 * already used during the year.
 *
 * Logic:
 * 1. Validate input (positive labor cost, split sums to 1, etc.).
 * 2. Compute total requested deduction = laborCost × rate.
 * 3. Distribute over persons by `split` (default: even).
 * 4. For each person, cap against remaining headroom. ROT has *two* caps:
 *    `rotMaxPerPerson` AND (`totalMaxPerPerson` − already used RUT).
 *    RUT only caps against `totalMaxPerPerson`.
 * 5. Sum and return per-person + total.
 */
export function calculateDeduction(input: CalculationInput): CalculationResult {
  validate(input);

  const year = input.year ?? new Date().getFullYear();
  const { rules, verified, resolvedYear } = getRulesForYear(year);
  const warnings: string[] = [];
  if (!verified) {
    warnings.push(
      `Rules for year ${year} are not verified — using ${resolvedYear} rules.`,
    );
  }

  const rate = input.kind === "ROT" ? rules.rotRate : rules.rutRate;
  const requestedTotal = round2(input.laborCost * rate);
  const split = normalizeSplit(input);

  const perPerson: PerPersonResult[] = input.persons.map(person => {
    const share = split[person.id];
    const allocated = round2(input.laborCost * share);
    const requested = round2(allocated * rate);
    const headroom = computeHeadroom(person, rules, input.kind);
    const granted = Math.min(requested, headroom.availableForKind);
    const lost = round2(requested - granted);

    if (lost > 0) {
      warnings.push(
        `Person ${person.id} exceeded their ${input.kind} cap by ${lost} SEK.`,
      );
    }

    const newRot =
      input.kind === "ROT"
        ? (person.alreadyUsed?.rot ?? 0) + granted
        : (person.alreadyUsed?.rot ?? 0);
    const newRut =
      input.kind === "RUT"
        ? (person.alreadyUsed?.rut ?? 0) + granted
        : (person.alreadyUsed?.rut ?? 0);

    return {
      id: person.id,
      allocatedLaborCost: allocated,
      requestedDeduction: requested,
      grantedDeduction: granted,
      lostToCap: lost,
      remainingHeadroom: {
        rot: Math.max(0, rules.rotMaxPerPerson - newRot),
        rut: Math.max(0, rules.totalMaxPerPerson - newRut - newRot),
        total: Math.max(0, rules.totalMaxPerPerson - newRut - newRot),
      },
    };
  });

  const totalDeduction = round2(perPerson.reduce((s, p) => s + p.grantedDeduction, 0));
  const customerPayment = round2(input.laborCost - totalDeduction);

  if (totalDeduction > requestedTotal + 0.01) {
    warnings.push(
      `Internal error: granted (${totalDeduction}) > requested (${requestedTotal}).`,
    );
  }

  return { totalDeduction, customerPayment, perPerson, warnings, year: resolvedYear };
}

function validate(input: CalculationInput): void {
  if (input.laborCost <= 0) {
    throw new Error("laborCost must be > 0");
  }
  if (!Number.isFinite(input.laborCost)) {
    throw new Error("laborCost must be a finite number");
  }
  if (input.persons.length === 0) {
    throw new Error("persons must not be empty");
  }
  const ids = new Set(input.persons.map(p => p.id));
  if (ids.size !== input.persons.length) {
    throw new Error("persons.id must be unique");
  }
  if (input.split) {
    for (const person of input.persons) {
      if (!(person.id in input.split)) {
        throw new Error(`split is missing person "${person.id}"`);
      }
    }
    const sum = Object.values(input.split).reduce((a, b) => a + b, 0);
    if (Math.abs(sum - 1) > 0.001) {
      throw new Error(`split must sum to 1.0, got ${sum}`);
    }
    for (const [id, share] of Object.entries(input.split)) {
      if (share < 0 || share > 1) {
        throw new Error(`split["${id}"] must be between 0 and 1, got ${share}`);
      }
    }
  }
}

function normalizeSplit(input: CalculationInput): Record<string, number> {
  if (input.split) return input.split;
  const share = 1 / input.persons.length;
  return Object.fromEntries(input.persons.map(p => [p.id, share]));
}

/**
 * Computes the person's remaining headroom for the given deduction kind.
 *
 * - **RUT:** cap is `totalMaxPerPerson − (already ROT + already RUT)`.
 * - **ROT:** two caps apply simultaneously — the per-kind `rotMaxPerPerson`
 *   minus already used ROT, AND the combined `totalMaxPerPerson` minus
 *   the sum of already used ROT+RUT. The lower cap wins.
 */
function computeHeadroom(
  person: Person,
  rules: YearRules,
  kind: DeductionKind,
): { availableForKind: number } {
  const usedRot = person.alreadyUsed?.rot ?? 0;
  const usedRut = person.alreadyUsed?.rut ?? 0;
  const totalLeft = Math.max(0, rules.totalMaxPerPerson - usedRot - usedRut);

  if (kind === "RUT") {
    return { availableForKind: totalLeft };
  }
  const rotLeft = Math.max(0, rules.rotMaxPerPerson - usedRot);
  return { availableForKind: Math.min(rotLeft, totalLeft) };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
