import { reglerForAr } from "./regler";
import type {
  ArsRegler,
  Avdragstyp,
  BeraknaInput,
  BeraknaResultat,
  PerPersonResultat,
  Person,
} from "./types";

/**
 * Räknar ut ROT- eller RUT-avdrag för en arbetskostnad fördelad mellan en
 * eller flera personer, med hänsyn till varje persons individuella tak och
 * vad de redan utnyttjat under året.
 *
 * Logik:
 * 1. Validera input (positiv arbetskostnad, fördelning summerar till 1, etc.).
 * 2. Beräkna totalt begärt avdrag = arbetskostnad × procentsats.
 * 3. Fördela på personer enligt `fordelning` (default: lika).
 * 4. För varje person: kapa mot personens återstående utrymme. För ROT gäller
 *    *två* tak: rotMaxPerPerson OCH (totalMaxPerPerson − redan utnyttjad RUT).
 *    För RUT gäller bara totalMaxPerPerson.
 * 5. Summera och returnera per-person + totalt.
 */
export function beraknaAvdrag(input: BeraknaInput): BeraknaResultat {
  validera(input);

  const ar = input.ar ?? new Date().getFullYear();
  const { regler, verifierat, anvantAr } = reglerForAr(ar);
  const varningar: string[] = [];
  if (!verifierat) {
    varningar.push(
      `Reglerna för år ${ar} är inte verifierade — använder ${anvantAr} års regler.`,
    );
  }

  const procent = input.typ === "ROT" ? regler.rotProcent : regler.rutProcent;
  const begartTotalt = round2(input.arbetskostnad * procent);
  const fordelning = normaliseraFordelning(input);

  const perPerson: PerPersonResultat[] = input.personer.map(person => {
    const andel = fordelning[person.id];
    const tilldelad = round2(input.arbetskostnad * andel);
    const begart = round2(tilldelad * procent);
    const utrymme = beraknaUtrymme(person, regler, input.typ);
    const faktisk = Math.min(begart, utrymme.tillgangligtForTyp);
    const bortfall = round2(begart - faktisk);

    if (bortfall > 0) {
      varningar.push(
        `Person ${person.id} översteg sitt ${input.typ}-utrymme med ${bortfall} kr.`,
      );
    }

    const nyRot =
      input.typ === "ROT"
        ? (person.redanUtnyttjat?.rot ?? 0) + faktisk
        : (person.redanUtnyttjat?.rot ?? 0);
    const nyRut =
      input.typ === "RUT"
        ? (person.redanUtnyttjat?.rut ?? 0) + faktisk
        : (person.redanUtnyttjat?.rut ?? 0);

    return {
      id: person.id,
      tilldeladArbetskostnad: tilldelad,
      begartAvdrag: begart,
      faktisktAvdrag: faktisk,
      bortfallPgaTak: bortfall,
      aterstaendeUtrymme: {
        rot: Math.max(0, regler.rotMaxPerPerson - nyRot),
        rut: Math.max(0, regler.totalMaxPerPerson - nyRut - nyRot),
        totalt: Math.max(0, regler.totalMaxPerPerson - nyRot - nyRut),
      },
    };
  });

  const totaltAvdrag = round2(perPerson.reduce((s, p) => s + p.faktisktAvdrag, 0));
  const kundbetalning = round2(input.arbetskostnad - totaltAvdrag);

  // Sanity: begärt vs faktiskt
  if (totaltAvdrag > begartTotalt + 0.01) {
    varningar.push(`Internt fel: faktiskt avdrag (${totaltAvdrag}) > begärt (${begartTotalt}).`);
  }

  return { totaltAvdrag, kundbetalning, perPerson, varningar, ar: anvantAr };
}

function validera(input: BeraknaInput): void {
  if (input.arbetskostnad <= 0) {
    throw new Error("arbetskostnad måste vara > 0");
  }
  if (!Number.isFinite(input.arbetskostnad)) {
    throw new Error("arbetskostnad måste vara ett ändligt tal");
  }
  if (input.personer.length === 0) {
    throw new Error("personer får inte vara tom");
  }
  const ids = new Set(input.personer.map(p => p.id));
  if (ids.size !== input.personer.length) {
    throw new Error("personer.id måste vara unika");
  }
  if (input.fordelning) {
    for (const person of input.personer) {
      if (!(person.id in input.fordelning)) {
        throw new Error(`fordelning saknar person "${person.id}"`);
      }
    }
    const summa = Object.values(input.fordelning).reduce((a, b) => a + b, 0);
    if (Math.abs(summa - 1) > 0.001) {
      throw new Error(`fordelning måste summera till 1.0, fick ${summa}`);
    }
    for (const [id, andel] of Object.entries(input.fordelning)) {
      if (andel < 0 || andel > 1) {
        throw new Error(`fordelning["${id}"] måste vara mellan 0 och 1, fick ${andel}`);
      }
    }
  }
}

function normaliseraFordelning(input: BeraknaInput): Record<string, number> {
  if (input.fordelning) return input.fordelning;
  const andel = 1 / input.personer.length;
  return Object.fromEntries(input.personer.map(p => [p.id, andel]));
}

/**
 * Beräknar personens återstående utrymme för den givna avdragstypen.
 *
 * - **RUT:** taket är `totalMaxPerPerson − (redan ROT + redan RUT)`.
 * - **ROT:** två tak gäller samtidigt — det per-typ-specifika `rotMaxPerPerson`
 *   minus redan utnyttjat ROT, OCH det totala `totalMaxPerPerson` minus
 *   summan av redan utnyttjat ROT+RUT. Det lägsta vinner.
 */
function beraknaUtrymme(
  person: Person,
  regler: ArsRegler,
  typ: Avdragstyp,
): { tillgangligtForTyp: number } {
  const utRot = person.redanUtnyttjat?.rot ?? 0;
  const utRut = person.redanUtnyttjat?.rut ?? 0;
  const totalKvar = Math.max(0, regler.totalMaxPerPerson - utRot - utRut);

  if (typ === "RUT") {
    return { tillgangligtForTyp: totalKvar };
  }
  const rotKvar = Math.max(0, regler.rotMaxPerPerson - utRot);
  return { tillgangligtForTyp: Math.min(rotKvar, totalKvar) };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
