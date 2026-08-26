export const LOCATION_ACCESS_MODES = ["ALL", "INCLUDE", "EXCLUDE"] as const;

export type LocationAccessMode = (typeof LOCATION_ACCESS_MODES)[number];

export interface EpsaDepartmentChartAccountPayload {
  EPSAId?: number | null;
  DepartmentId?: number | null;
  ChartAccountId?: number | null;
  ChartAccountIds?: number[] | null;
  LocationID?: number | null;
  LocationIDs?: number[] | null;
  LocationAccessMode?: LocationAccessMode | string | null;
  UseAllActiveAccounts?: boolean | null;
  IsActive?: boolean | null;
}

const toOptionalInt = (value: unknown): number | null => {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : Number.isFinite(parsed) ? Math.trunc(parsed) : null;
};

const toOptionalBoolean = (value: unknown, defaultValue = true): boolean => {
  if (value === null || value === undefined || value === "") {
    return defaultValue;
  }

  if (typeof value === "boolean") {
    return value;
  }

  if (value === 1 || value === "1" || value === "true" || value === "True") {
    return true;
  }

  if (value === 0 || value === "0" || value === "false" || value === "False") {
    return false;
  }

  return defaultValue;
};

const normalizeIdList = (value: unknown): number[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => toOptionalInt(item))
    .filter((item): item is number => item !== null);
};

const normalizeLocationAccessMode = (value: unknown): LocationAccessMode => {
  const mode = String(value || "ALL")
    .trim()
    .toUpperCase();

  if (mode === "ALL" || mode === "INCLUDE" || mode === "EXCLUDE") {
    return mode;
  }

  return "ALL";
};

export const normalizeEpsaDepartmentChartAccountPayload = (
  payload: EpsaDepartmentChartAccountPayload
): EpsaDepartmentChartAccountPayload => {
  const locationAccessMode = normalizeLocationAccessMode(payload.LocationAccessMode);
  const locationIds = normalizeIdList(payload.LocationIDs);
  const singleLocationId = toOptionalInt(payload.LocationID);

  return {
    EPSAId: toOptionalInt(payload.EPSAId),
    DepartmentId: toOptionalInt(payload.DepartmentId),
    ChartAccountId: toOptionalInt(payload.ChartAccountId),
    ChartAccountIds: normalizeIdList(payload.ChartAccountIds),
    LocationAccessMode: locationAccessMode,
    LocationID: locationAccessMode === "ALL" ? null : singleLocationId,
    LocationIDs: locationAccessMode === "ALL" ? [] : locationIds.length ? locationIds : singleLocationId != null ? [singleLocationId] : [],
    UseAllActiveAccounts: toOptionalBoolean(payload.UseAllActiveAccounts, false),
    IsActive: toOptionalBoolean(payload.IsActive, true)
  };
};

export const validateEpsaDepartmentChartAccountPayload = (
  payload: EpsaDepartmentChartAccountPayload
): string[] => {
  const errors: string[] = [];

  if (payload.EPSAId === null || payload.EPSAId === undefined) {
    errors.push("EPSAId is required");
  }

  const mode = String(payload.LocationAccessMode || "").trim().toUpperCase();
  if (!LOCATION_ACCESS_MODES.includes(mode as LocationAccessMode)) {
    errors.push("LocationAccessMode must be one of: ALL, INCLUDE, EXCLUDE");
  }

  const locationIds = payload.LocationIDs?.length
    ? payload.LocationIDs
    : payload.LocationID != null
      ? [payload.LocationID]
      : [];

  if (mode === "ALL") {
    if (payload.LocationID != null || (payload.LocationIDs?.length ?? 0) > 0) {
      errors.push("LocationID must be NULL when LocationAccessMode is ALL");
    }
  } else if (mode === "INCLUDE" || mode === "EXCLUDE") {
    if (locationIds.length === 0) {
      errors.push(`At least one LocationID is required when LocationAccessMode is ${mode}`);
    }
  }

  if (payload.UseAllActiveAccounts) {
    // DepartmentId optional: when omitted, All Accounts is applied to every Manager department.
    // ChartAccountId must remain NULL for All Accounts rows (enforced on create).
    return errors;
  }

  if (payload.DepartmentId === null || payload.DepartmentId === undefined) {
    errors.push("DepartmentId is required");
  }

  const chartAccountIds = payload.ChartAccountIds?.length
    ? payload.ChartAccountIds
    : payload.ChartAccountId !== null && payload.ChartAccountId !== undefined
      ? [payload.ChartAccountId]
      : [];

  if (chartAccountIds.length === 0) {
    errors.push("At least one ChartAccountId is required when not using All Accounts");
  }

  return errors;
};
