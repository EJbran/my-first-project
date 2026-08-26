export const VACATION_DEFAULT_PAGE_SIZE = 10;
export const VACATION_MAX_PAGE_SIZE = 100;

export type VacationListQuery = {
  page: number;
  pageSize: number;
};

export type VacationListQueryResult =
  | { success: true; value: VacationListQuery }
  | { success: false; errors: string[] };

const readSingleQueryValue = (
  source: Record<string, unknown>,
  key: string,
  errors: string[]
): string | null => {
  const raw = source[key];
  if (raw === undefined || raw === null) return null;

  if (Array.isArray(raw)) {
    if (raw.length !== 1 || typeof raw[0] !== "string") {
      errors.push(`${key} must be provided once`);
      return null;
    }
    return raw[0].trim() || null;
  }

  if (typeof raw !== "string") {
    errors.push(`${key} must be a string`);
    return null;
  }

  return raw.trim() || null;
};

const parsePositiveInteger = (
  value: string | null,
  field: string,
  fallback: number,
  maximum: number,
  errors: string[]
): number => {
  if (value === null) return fallback;
  if (!/^\d+$/.test(value)) {
    errors.push(`${field} must be a positive integer`);
    return fallback;
  }

  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed <= 0 || parsed > maximum) {
    errors.push(`${field} must be between 1 and ${maximum}`);
    return fallback;
  }

  return parsed;
};

export const parseVacationListQuery = (
  source: Record<string, unknown>
): VacationListQueryResult => {
  const errors: string[] = [];
  const page = parsePositiveInteger(
    readSingleQueryValue(source, "page", errors),
    "page",
    1,
    Number.MAX_SAFE_INTEGER,
    errors
  );
  const pageSize = parsePositiveInteger(
    readSingleQueryValue(source, "pageSize", errors),
    "pageSize",
    VACATION_DEFAULT_PAGE_SIZE,
    VACATION_MAX_PAGE_SIZE,
    errors
  );

  return errors.length > 0
    ? { success: false, errors }
    : { success: true, value: { page, pageSize } };
};
