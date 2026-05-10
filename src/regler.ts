import type { ArsRegler } from "./types";

/**
 * Skatteverkets regler för ROT/RUT per år.
 *
 * **2026 (verifierat):**
 * - ROT: 30 % av arbetskostnaden, max 50 000 kr/person/år
 *   (under perioden 12 maj – 31 dec 2025 var det tillfälligt höjt till 50 %,
 *    men från 1 jan 2026 är det tillbaka på 30 %)
 * - RUT: 50 % av arbetskostnaden
 * - Gemensamt tak: ROT + RUT max 75 000 kr/person/år
 *   (varav max 50 000 kr får utgöras av ROT-avdrag)
 *
 * Källor (verifierade 2026-05-10):
 * - https://www.skatteverket.se/foretag/skatterochavdrag/rotochrut.4.2ef18e6a125660db8b080002674.html
 * - https://offerta.se/guider/ovrigt/rot-och-rutavdrag
 *
 * För tidigare år: utvidga `ARS_REGLER` med fler nycklar och uppdatera tester.
 */
export const ARS_REGLER: Record<number, ArsRegler> = {
  2026: {
    rotProcent: 0.3,
    rutProcent: 0.5,
    rotMaxPerPerson: 50_000,
    totalMaxPerPerson: 75_000,
  },
};

/**
 * Hämtar reglerna för ett givet år. Faller tillbaka till senaste verifierade
 * året om året saknas, och returnerar en flagga så anroparen kan reagera.
 */
export function reglerForAr(ar: number): { regler: ArsRegler; verifierat: boolean; anvantAr: number } {
  if (ARS_REGLER[ar]) {
    return { regler: ARS_REGLER[ar], verifierat: true, anvantAr: ar };
  }
  const verifieradeAr = Object.keys(ARS_REGLER)
    .map(Number)
    .sort((a, b) => b - a);
  const senaste = verifieradeAr[0];
  return { regler: ARS_REGLER[senaste], verifierat: false, anvantAr: senaste };
}
