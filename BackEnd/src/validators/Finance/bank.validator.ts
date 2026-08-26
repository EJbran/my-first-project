export interface BankPayload {
  BankId?: number | null;
  Branch?: string | null;
  SerialNum_Id?: number | null;
  GLCreditAccount?: string | null;
}

const toOptionalInt = (value: unknown): number | null => {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : Number.isFinite(parsed) ? Math.trunc(parsed) : null;
};

export const validateBankPayload = (payload: BankPayload): string[] => {
  const errors: string[] = [];

  if (payload.BankId !== null && payload.BankId !== undefined && !Number.isFinite(Number(payload.BankId))) {
    errors.push("BankId must be a valid number");
  }

  if (
    payload.SerialNum_Id !== null &&
    payload.SerialNum_Id !== undefined &&
    !Number.isFinite(Number(payload.SerialNum_Id))
  ) {
    errors.push("SerialNum_Id must be a valid number");
  }

  if (payload.Branch && payload.Branch.length > 100) {
    errors.push("Branch must be at most 100 characters");
  }

  if (payload.GLCreditAccount && payload.GLCreditAccount.length > 50) {
    errors.push("GLCreditAccount must be at most 50 characters");
  }

  return errors;
};

export const normalizeBankPayload = (payload: BankPayload): BankPayload => ({
  BankId: toOptionalInt(payload.BankId),
  Branch: payload.Branch?.trim() || null,
  SerialNum_Id: toOptionalInt(payload.SerialNum_Id),
  GLCreditAccount: payload.GLCreditAccount?.trim() || null
});
