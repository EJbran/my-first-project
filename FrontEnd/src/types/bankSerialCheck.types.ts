import type { Bank } from "./bank.types";

export interface BankSerialCheck {
  ID_BANK_SERIAL_CHECKS: number;
  From_Check: string | null;
  To_Check: string | null;
  Creation_date: string | null;
  BANKID: number | null;
  Bank?: Pick<Bank, "Id" | "Branch" | "BankId" | "GLCreditAccount"> | null;
}
