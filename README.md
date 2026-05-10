# rot-rut-avdrag

[![CI](https://github.com/lucasros98/rot-rut-avdrag/actions/workflows/ci.yml/badge.svg)](https://github.com/lucasros98/rot-rut-avdrag/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue.svg)](tsconfig.json)

Calculate **ROT and RUT tax deductions** according to the rules of the
Swedish Tax Agency (Skatteverket). Handles per-person caps, the combined
total cap, already-used deductions, and split between several persons in
a household. Also validates invoice fields per form SKV 4528.

Pure function package — no API calls, no dependencies, works in Node and
the browser.

## Why

The rules change every year (RUT cap was raised in 2024; the ROT rate
was temporarily 50% during late 2025 and reverted to 30% on 1 Jan 2026).
Hard-coding `amount * 0.3` in your checkout is a bug waiting to happen.

## Install

```bash
npm install rot-rut-avdrag
```

## Quickstart

```ts
import { calculateDeduction } from "rot-rut-avdrag";

const r = calculateDeduction({
  kind: "ROT",
  laborCost: 50_000,
  persons: [{ id: "lucas" }],
});

console.log(r.totalDeduction);   // 15_000  (30% of 50 000)
console.log(r.customerPayment);  // 35_000
```

## Rules for 2026 (verified)

| | ROT | RUT |
|---|---|---|
| Rate | **30%** | **50%** |
| Per-person cap | 50 000 SEK | (shares the combined cap) |
| Combined cap (ROT + RUT) per person | **75 000 SEK** | |

Two cohabitants who both own the home can together claim **150 000 SEK**
per year.

> **Sources (verified 2026-05-10):** [Skatteverket — ROT and
> RUT](https://www.skatteverket.se/foretag/skatterochavdrag/rotochrut.4.2ef18e6a125660db8b080002674.html),
> [Offerta 2026 guide](https://offerta.se/guider/ovrigt/rot-och-rutavdrag).

## Common scenarios

### Two cohabitants share the deduction

```ts
calculateDeduction({
  kind: "ROT",
  laborCost: 400_000,
  persons: [{ id: "a" }, { id: "b" }],
});
// totalDeduction: 100_000 (50 000 each, capped per person)
```

### Custom split (one person pays more)

```ts
calculateDeduction({
  kind: "ROT",
  laborCost: 100_000,
  persons: [{ id: "a" }, { id: "b" }],
  split: { a: 0.7, b: 0.3 },
});
```

### Account for already-used deductions

```ts
calculateDeduction({
  kind: "RUT",
  laborCost: 200_000,
  persons: [{
    id: "a",
    alreadyUsed: { rot: 50_000 } // already maxed out ROT
  }],
});
// grantedDeduction: 25_000 (75 000 combined cap − 50 000 already ROT)
```

## Validate invoice fields

```ts
import { validateInvoice } from "rot-rut-avdrag";

const errors = validateInvoice({
  kind: "ROT",
  buyerPersonnummer: "199001011234",
  contractorOrgnummer: "556677-8899",
  laborCost: 50_000,
  requestedAmount: 15_000,
  fastighetsbeteckning: "STOCKHOLM SKARPNÄCK 1:14",
  workDate: "2026-04-15",
});
// errors === [] → valid invoice
```

A few field names stay in Swedish (`fastighetsbeteckning`,
`buyerPersonnummer`, `contractorOrgnummer`, `brfApartmentNumber`,
`brfOrgnummer`) because they map 1:1 to Skatteverket's official form
fields. Easier for devs who have the form in front of them.

## What this package does **not** do

- **Does not validate personnummer/orgnummer Luhn checksums.** Use
  [`personnummer`](https://npmjs.com/package/personnummer) and
  [`organisationsnummer`](https://npmjs.com/package/organisationsnummer)
  for that.
- **Does not call Skatteverket.** No API integration — just numbers and
  field validation.
- **Does not decide if a service qualifies for ROT or RUT.** The list of
  qualifying work is long and changes — check Skatteverket.
- **Does not include the Grön teknik (green tech) deduction** for
  solar panels and EV chargers. That is a separate deduction with its
  own rules.

## Roadmap

- [ ] 2025 rules (for retroactive calculations)
- [ ] Grön teknik (`kind: "GREEN_TECH"`)
- [ ] CLI: `npx rot-rut-avdrag --kind=ROT --labor-cost=50000`
- [ ] Generate a complete SKV 4528 payload (JSON ready to POST to
      Skatteverket's e-service)

## License

MIT — see [LICENSE](LICENSE).
