export interface EpsaPayload {
  InterstName?: string;
  NOC?: number | null;
  PC?: number | null;
  EPSAType?: string | null;
}

const EPSA_TYPES = ["Opex", "Capex", "Temp"] as const;

const toOptionalNumber = (value: unknown): number | null => {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const toOptionalType = (value: unknown): string | null => {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  return String(value).trim() || null;
};

const validatePercentage = (value: number | null | undefined, fieldName: string): string | null => {
  if (value === null || value === undefined) {
    return null;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return `${fieldName} must be a valid percentage`;
  }

  if (parsed < 0 || parsed > 100) {
    return `${fieldName} must be between 0 and 100`;
  }

  return null;
};

export const validateEpsaPayload = (payload: EpsaPayload): string[] => {
  const errors: string[] = [];

  if (!payload.InterstName?.trim()) {
    errors.push("InterstName is required");
  }

  const nocError = validatePercentage(payload.NOC, "NOC");
  if (nocError) {
    errors.push(nocError);
  }

  const pcError = validatePercentage(payload.PC, "PC");
  if (pcError) {
    errors.push(pcError);
  }

  if (payload.EPSAType != null && !EPSA_TYPES.includes(payload.EPSAType as (typeof EPSA_TYPES)[number])) {
    errors.push("EPSAType must be one of: Opex, Capex, Temp");
  }

  return errors;
};

export const normalizeEpsaPayload = (payload: EpsaPayload): EpsaPayload => ({
  InterstName: payload.InterstName?.trim(),
  NOC: toOptionalNumber(payload.NOC),
  PC: toOptionalNumber(payload.PC),
  EPSAType: toOptionalType(payload.EPSAType)
});
