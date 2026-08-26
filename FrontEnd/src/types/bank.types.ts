import type { BankGeneral } from "./bankGeneral.types";

export interface Bank {
  Id: number;
  BankId: number | null;
  Branch: string | null;
  SerialNum_Id: number | null;
  GLCreditAccount: string | null;
  BankGeneral?: Pick<BankGeneral, "Id" | "BackName"> | null;
}
