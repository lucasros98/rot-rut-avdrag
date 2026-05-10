# rot-rut-avdrag

[![CI](https://github.com/lucasros98/rot-rut-avdrag/actions/workflows/ci.yml/badge.svg)](https://github.com/lucasros98/rot-rut-avdrag/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue.svg)](tsconfig.json)

Beräkna **ROT- och RUT-avdrag** enligt Skatteverkets regler. Hanterar tak per
person, gemensamt totaltak, redan utnyttjade avdrag och fördelning mellan
flera personer i hushållet. Validerar även faktureringsfält enligt blankett
SKV 4528.

Ren funktionspaket — inga API-anrop, inga dependencies, fungerar i Node och
browser.

## Varför

Reglerna ändras varje år (RUT-taket höjdes 2024, ROT-procenten var tillfälligt
50% under hösten 2025, tillbaka på 30% från 1 jan 2026). Att hårdkoda
`amount * 0.3` i din checkout är en bugg som väntar på att hända.

## Install

```bash
npm install rot-rut-avdrag
```

## Quickstart

```ts
import { beraknaAvdrag } from "rot-rut-avdrag";

// Enkel ROT-beräkning
const r = beraknaAvdrag({
  typ: "ROT",
  arbetskostnad: 50_000,
  personer: [{ id: "lucas" }],
});

console.log(r.totaltAvdrag);    // 15_000  (30% av 50 000)
console.log(r.kundbetalning);   // 35_000
```

## Regler 2026 (verifierade)

| | ROT | RUT |
|---|---|---|
| Procentsats | **30 %** | **50 %** |
| Max per person | 50 000 kr | (delar totaltaket) |
| Gemensamt totaltak per person | **75 000 kr (ROT + RUT)** | |

Två sambor som båda äger huset kan tillsammans utnyttja **150 000 kr** per år.

> **Källor (verifierade 2026-05-10):** [Skatteverket — ROT och
> RUT](https://www.skatteverket.se/foretag/skatterochavdrag/rotochrut.4.2ef18e6a125660db8b080002674.html),
> [Offerta 2026-guide](https://offerta.se/guider/ovrigt/rot-och-rutavdrag).

## Vanliga scenarier

### Två sambor delar avdraget

```ts
beraknaAvdrag({
  typ: "ROT",
  arbetskostnad: 400_000,
  personer: [{ id: "a" }, { id: "b" }],
});
// totaltAvdrag: 100_000 (50 000 var, taket per person)
```

### Custom fördelning (en betalar mer)

```ts
beraknaAvdrag({
  typ: "ROT",
  arbetskostnad: 100_000,
  personer: [{ id: "a" }, { id: "b" }],
  fordelning: { a: 0.7, b: 0.3 },
});
```

### Ta hänsyn till redan utnyttjat avdrag

```ts
beraknaAvdrag({
  typ: "RUT",
  arbetskostnad: 200_000,
  personer: [{
    id: "a",
    redanUtnyttjat: { rot: 50_000 } // har redan max-utnyttjat ROT
  }],
});
// faktisktAvdrag: 25_000 (75 000 totaltak − 50 000 redan ROT)
```

## Validera faktura-fält

```ts
import { valideraFaktura } from "rot-rut-avdrag";

const fel = valideraFaktura({
  typ: "ROT",
  kopareCpr: "199001011234",
  utforareOrgnr: "556677-8899",
  arbetskostnad: 50_000,
  begartBelopp: 15_000,
  fastighetsbeteckning: "STOCKHOLM SKARPNÄCK 1:14",
  datumUtfortArbete: "2026-04-15",
});
// fel === [] → giltig faktura
```

## Vad paketet **inte** gör

- **Validerar inte personnummer/orgnummer-checksumma.** Använd
  [`personnummer`](https://npmjs.com/package/personnummer) och
  [`organisationsnummer`](https://npmjs.com/package/organisationsnummer)
  för det.
- **Skickar inget till Skatteverket.** Ingen API-integration ingår — paketet
  räknar bara ut beloppen och validerar fältfältet.
- **Avgör inte om en tjänst är ROT- eller RUT-grundande.** Listan över
  godkända arbeten är lång och förändras — kolla mot Skatteverket.
- **Räknar inte med Grön teknik-avdrag** (solceller, laddstolpar). Det är
  ett separat avdrag med egna regler.

## Roadmap

- [ ] 2025 års regler (för retroaktiva beräkningar)
- [ ] Grön teknik-avdrag (`typ: "GRON"`)
- [ ] CLI: `npx rot-rut-avdrag --typ=ROT --arbetskostnad=50000`
- [ ] Generera komplett SKV 4528-payload (JSON som kan POSTas till Skatteverkets API)

## License

MIT — se [LICENSE](LICENSE).
