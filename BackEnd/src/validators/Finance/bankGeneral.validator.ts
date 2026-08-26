export interface BankGeneralPayload {
  BackName?: string | null;
}

export const validateBankGeneralPayload = (_payload: BankGeneralPayload): string[] => [];

export const normalizeBankGeneralPayload = (payload: BankGeneralPayload): BankGeneralPayload => ({
  BackName: payload.BackName?.trim() || null
});
