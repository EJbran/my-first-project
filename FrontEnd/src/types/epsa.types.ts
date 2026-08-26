export type EpsaType = "Opex" | "Capex" | "Temp";

export const EPSA_TYPES: EpsaType[] = ["Opex", "Capex", "Temp"];

export interface Epsa {
  Id: number;
  InterstName: string;
  NOC: number | null;
  PC: number | null;
  EPSAType: EpsaType | string | null;
}
