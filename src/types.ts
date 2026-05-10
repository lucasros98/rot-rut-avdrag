/**
 * Avdragstyp — ROT eller RUT.
 *
 * - **ROT** (Reparation, Ombyggnad, Tillbyggnad): arbete på den egna bostaden.
 * - **RUT** (Rengöring, Underhåll, Tvätt): hushållsnära tjänster.
 */
export type Avdragstyp = "ROT" | "RUT";

export interface Person {
  /** Person-id används bara för att hålla isär flera personer. Inte ett personnummer. */
  id: string;
  /**
   * Belopp som personen redan har utnyttjat under aktuellt år, uppdelat på
   * ROT och RUT. Lämna 0 om inget utnyttjats. Kommer från egen bokföring
   * eller från Skatteverkets "Mina sidor".
   */
  redanUtnyttjat?: {
    rot?: number;
    rut?: number;
  };
}

export interface BeraknaInput {
  /** Vilket avdrag det gäller. */
  typ: Avdragstyp;
  /**
   * Arbetskostnad i kronor (exkl. moms eller inkl., bara konsekvent — se README).
   * Endast arbete räknas: material, resor och utrustning är inte avdragsgilla.
   */
  arbetskostnad: number;
  /**
   * Personerna som delar på avdraget (en eller flera ägare/boende). Avdraget
   * delas lika om inget annat anges via `fordelning`.
   */
  personer: Person[];
  /**
   * Valfri viktning av avdraget mellan personer (måste summera till 1.0).
   * Default: jämn fördelning över alla personer.
   * @example { "p1": 0.6, "p2": 0.4 }
   */
  fordelning?: Record<string, number>;
  /**
   * Skatteår — styr vilka tak och procentsatser som används. Default: nuvarande
   * år. Endast 2026 är fullt verifierad i v0.1; tidigare år ger ett varnings-
   * fält i resultatet (`varningar`).
   */
  ar?: number;
}

export interface PerPersonResultat {
  id: string;
  /** Hur stor del av arbetskostnaden som tilldelats personen (kr). */
  tilldeladArbetskostnad: number;
  /** Avdragsbeloppet *innan* taket appliceras (kr, alltid >= 0). */
  begartAvdrag: number;
  /** Slutligt avdragsbelopp för personen efter alla tak (kr). */
  faktisktAvdrag: number;
  /**
   * Hur mycket av avdraget som föll bort på grund av personens tak. Användbart
   * för att visa kunden varför hen inte fick fullt avdrag.
   */
  bortfallPgaTak: number;
  /** Återstående utrymme för personen efter detta köp (kr). */
  aterstaendeUtrymme: {
    rot: number;
    rut: number;
    /** Återstående totaltak (ROT+RUT). */
    totalt: number;
  };
}

export interface BeraknaResultat {
  /** Det totala avdraget som firman kan begära från Skatteverket. */
  totaltAvdrag: number;
  /** Vad kunden faktiskt ska betala efter avdraget (arbetskostnad − totaltAvdrag). */
  kundbetalning: number;
  /** Hur avdraget fördelades per person. */
  perPerson: PerPersonResultat[];
  /**
   * Mjuka varningar som inte är fel men som klienten kan vilja visa. T.ex.
   * "Avdrag översteg personens utrymme".
   */
  varningar: string[];
  /** Året som beräkningen gjordes mot. */
  ar: number;
}

export interface ArsRegler {
  /** Procentsats för ROT (0.30 = 30%). */
  rotProcent: number;
  /** Procentsats för RUT (0.50 = 50%). */
  rutProcent: number;
  /** Maxbelopp ROT per person och år (kr). */
  rotMaxPerPerson: number;
  /** Maxbelopp RUT + ROT tillsammans per person och år (kr). */
  totalMaxPerPerson: number;
}
