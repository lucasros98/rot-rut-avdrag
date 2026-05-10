export { calculateDeduction } from "./calculate";
export { validateInvoice } from "./invoice";
export { RULES_BY_YEAR, getRulesForYear } from "./rules";
export type {
  CalculationInput,
  CalculationResult,
  DeductionKind,
  PerPersonResult,
  Person,
  YearRules,
} from "./types";
export type { InvoiceInput, InvoiceValidationError } from "./invoice";
