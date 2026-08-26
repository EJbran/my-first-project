export interface BankSerialCheckPayload {
  From_Check?: string | null;
  To_Check?: string | null;
  Creation_date?: string | Date | null;
  BANKID?: number | null;
}

const toOptionalInt = (value: unknown): number | null => {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.trunc(parsed) : null;
};

const pad2 = (value: number) => String(value).padStart(2, "0");

/** SQL Server style 120: YYYY-MM-DD HH:mm:ss */
export const formatSqlServerDateTime = (date: Date): string =>
  `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())} ${pad2(date.getHours())}:${pad2(date.getMinutes())}:${pad2(date.getSeconds())}`;

export const toOptionalSqlDateTime = (value: unknown): string | null => {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : formatSqlServerDateTime(value);
  }

  const raw = String(value).trim();
  if (!raw) {
    return null;
  }

  if (/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2})?/.test(raw)) {
    const normalized = raw.includes("T") ? raw : raw.replace(" ", "T");
    const withSeconds = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(normalized)
      ? `${normalized}:00`
      : normalized.slice(0, 19);
    const parsed = new Date(withSeconds);
    return Number.isNaN(parsed.getTime()) ? null : formatSqlServerDateTime(parsed);
  }

  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : formatSqlServerDateTime(parsed);
};

export const compareCheckRange = (fromCheck: string, toCheck: string): number => {
  const fromNum = Number(fromCheck);
  const toNum = Number(toCheck);

  if (
    fromCheck !== "" &&
    toCheck !== "" &&
    Number.isFinite(fromNum) &&
    Number.isFinite(toNum)
  ) {
    return fromNum - toNum;
  }

  return fromCheck.localeCompare(toCheck, undefined, { numeric: true, sensitivity: "base" });
};

export const validateBankSerialCheckPayload = (payload: BankSerialCheckPayload): string[] => {
  const errors: string[] = [];
  const fromCheck = payload.From_Check?.trim() || "";
  const toCheck = payload.To_Check?.trim() || "";

  if (fromCheck.length > 50) {
    errors.push("From_Check must be at most 50 characters");
  }

  if (toCheck.length > 50) {
    errors.push("To_Check must be at most 50 characters");
  }

  if (!fromCheck) {
    errors.push("From_Check is required");
  }

  if (!toCheck) {
    errors.push("To_Check is required");
  }

  if (fromCheck && toCheck && compareCheckRange(fromCheck, toCheck) >= 0) {
    errors.push("From_Check must be less than To_Check");
  }

  if (
    payload.Creation_date !== null &&
    payload.Creation_date !== undefined &&
    payload.Creation_date !== "" &&
    toOptionalSqlDateTime(payload.Creation_date) === null
  ) {
    errors.push("Creation_date must be a valid date");
  }

  if (
    payload.BANKID !== null &&
    payload.BANKID !== undefined &&
    !Number.isFinite(Number(payload.BANKID))
  ) {
    errors.push("BANKID must be a valid number");
  }

  return errors;
};

export const normalizeBankSerialCheckPayload = (
  payload: BankSerialCheckPayload
): Omit<BankSerialCheckPayload, "Creation_date"> & { Creation_date?: string | null } => ({
  From_Check: payload.From_Check?.trim() || null,
  To_Check: payload.To_Check?.trim() || null,
  Creation_date: toOptionalSqlDateTime(payload.Creation_date),
  BANKID: toOptionalInt(payload.BANKID)
});
