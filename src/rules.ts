import type { YearRules } from "./types";

/**
 * Skatteverket's ROT/RUT rules per year.
 *
 * **2026 (verified):**
 * - ROT: 30% of labor cost, max 50 000 SEK/person/year.
 *   (During 12 May – 31 Dec 2025 the rate was temporarily raised to 50%,
 *    but reverted to 30% on 1 Jan 2026.)
 * - RUT: 50% of labor cost.
 * - Combined cap: ROT + RUT max 75 000 SEK/person/year (of which at most
 *   50 000 may come from ROT).
 *
 * Sources (verified 2026-05-10):
 * - https://www.skatteverket.se/foretag/skatterochavdrag/rotochrut.4.2ef18e6a125660db8b080002674.html
 * - https://offerta.se/guider/ovrigt/rot-och-rutavdrag
 *
 * To add earlier years: extend `RULES_BY_YEAR` and update tests.
 */
export const RULES_BY_YEAR: Record<number, YearRules> = {
  2026: {
    rotRate: 0.3,
    rutRate: 0.5,
    rotMaxPerPerson: 50_000,
    totalMaxPerPerson: 75_000,
  },
};

/**
 * Looks up rules for a given year. Falls back to the most recent verified
 * year if missing, and signals that via `verified=false` so callers can
 * surface a warning.
 */
export function getRulesForYear(year: number): {
  rules: YearRules;
  verified: boolean;
  resolvedYear: number;
} {
  if (RULES_BY_YEAR[year]) {
    return { rules: RULES_BY_YEAR[year], verified: true, resolvedYear: year };
  }
  const verifiedYears = Object.keys(RULES_BY_YEAR)
    .map(Number)
    .sort((a, b) => b - a);
  const latest = verifiedYears[0];
  return { rules: RULES_BY_YEAR[latest], verified: false, resolvedYear: latest };
}
