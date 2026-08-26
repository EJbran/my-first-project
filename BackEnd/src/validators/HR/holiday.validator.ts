export const HOLIDAY_TYPES = ["NATIONAL", "RELIGIOUS"] as const;

export type HolidayType = (typeof HOLIDAY_TYPES)[number];

export interface HolidayPayload {
  HolidayCode?: string | null;
  HolidayNameAr?: string;
  HolidayNameEn?: string | null;
  HolidayType?: string;
  HolidayDate?: string | null;
  IsFixedDate?: boolean;
  IsActive?: boolean;
  Description?: string | null;
}

const toOptionalText = (value: unknown, maxLength: number): string | null => {
  if (value === null || value === undefined) {
    return null;
  }

  const trimmed = String(value).trim();
  if (!trimmed) {
    return null;
  }

  return trimmed.slice(0, maxLength);
};

const toRequiredText = (value: unknown, maxLength: number): string => {
  const trimmed = String(value ?? "").trim();
  return trimmed.slice(0, maxLength);
};

const toBool = (value: unknown, fallback: boolean): boolean => {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }

  if (typeof value === "boolean") {
    return value;
  }

  if (value === 1 || value === "1" || value === "true" || value === "TRUE") {
    return true;
  }

  if (value === 0 || value === "0" || value === "false" || value === "FALSE") {
    return false;
  }

  return Boolean(value);
};

const toDateOnly = (value: unknown): string | null => {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const text = String(value).trim();
  if (!text) {
    return null;
  }

  return text.slice(0, 10);
};

export const validateHolidayPayload = (payload: HolidayPayload): string[] => {
  const errors: string[] = [];

  if (!payload.HolidayNameAr?.trim()) {
    errors.push("HolidayNameAr is required");
  }

  if (!payload.HolidayType?.trim()) {
    errors.push("HolidayType is required");
  }

  if (!payload.HolidayDate?.trim()) {
    errors.push("HolidayDate is required");
  }

  if (payload.HolidayCode && payload.HolidayCode.length > 50) {
    errors.push("HolidayCode must be at most 50 characters");
  }

  if (payload.HolidayNameAr && payload.HolidayNameAr.length > 200) {
    errors.push("HolidayNameAr must be at most 200 characters");
  }

  if (payload.HolidayNameEn && payload.HolidayNameEn.length > 200) {
    errors.push("HolidayNameEn must be at most 200 characters");
  }

  if (payload.HolidayType && payload.HolidayType.length > 30) {
    errors.push("HolidayType must be at most 30 characters");
  }

  if (payload.Description && payload.Description.length > 1000) {
    errors.push("Description must be at most 1000 characters");
  }

  return errors;
};

export const normalizeHolidayPayload = (payload: HolidayPayload): HolidayPayload => ({
  HolidayCode: toOptionalText(payload.HolidayCode, 50),
  HolidayNameAr: toRequiredText(payload.HolidayNameAr, 200),
  HolidayNameEn: toOptionalText(payload.HolidayNameEn, 200),
  HolidayType: toRequiredText(payload.HolidayType, 30),
  HolidayDate: toDateOnly(payload.HolidayDate),
  IsFixedDate: toBool(payload.IsFixedDate, true),
  IsActive: toBool(payload.IsActive, true),
  Description: toOptionalText(payload.Description, 1000)
});
