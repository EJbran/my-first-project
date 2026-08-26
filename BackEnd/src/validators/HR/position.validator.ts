export const POSITION_DEFAULT_PAGE_SIZE = 25;
export const POSITION_MAX_PAGE_SIZE = 100;
export const POSITION_SORT_FIELDS = [
  "positionId",
  "positionNumber",
  "job",
  "positionType",
  "positionLevel",
  "employee",
  "occupancy",
  "dataStatus"
] as const;
export type PositionSortField = typeof POSITION_SORT_FIELDS[number];
export type PositionSortDirection = "asc" | "desc";

export type ValidationResult<T> =
  | { success: true; value: T }
  | { success: false; errors: string[] };

export interface PositionListQuery {
  page: number;
  pageSize: number;
  jobId: number | null;
  search: string | null;
  occupancy: "all" | "occupied" | "vacant";
  positionType: string | null;
  status: string | null;
  sortBy: PositionSortField;
  sortDirection: PositionSortDirection;
}

export interface CreatePositionPayload {
  positionNumber: string;
  positionType: string | null;
  positionLevel: string | null;
  positionDegree: string | null;
  positionDateCreation: string | null;
  status: string | null;
  jobId: number;
}

export interface AssignPositionPayload {
  employeeId: number;
  positionId: number;
}

export interface TransferPositionPayload {
  employeeId: number;
  positionId: number;
}

export interface ReleasePositionPayload {
  employeeId: number;
}

const hasOwn = (source: Record<string, unknown>, key: string): boolean =>
  Object.prototype.hasOwnProperty.call(source, key);

const readAlias = (
  source: Record<string, unknown>,
  camelCaseKey: string,
  pascalCaseKey: string
): unknown => hasOwn(source, camelCaseKey) ? source[camelCaseKey] : source[pascalCaseKey];

const parsePositiveInteger = (
  value: unknown,
  field: string,
  errors: string[],
  maximum = Number.MAX_SAFE_INTEGER
): number => {
  const normalized = typeof value === "number"
    ? String(value)
    : typeof value === "string"
      ? value.trim()
      : "";

  if (!/^[1-9]\d*$/.test(normalized)) {
    errors.push(`${field} must be a positive integer`);
    return 0;
  }

  const parsed = Number(normalized);
  if (!Number.isSafeInteger(parsed) || parsed > maximum) {
    errors.push(`${field} must be a positive integer`);
    return 0;
  }
  return parsed;
};

const parsePageValue = (
  value: unknown,
  field: string,
  errors: string[],
  defaultValue: number,
  maximum: number
): number => {
  if (value === undefined || value === null || value === "") return defaultValue;
  const normalized = Array.isArray(value) ? "" : String(value).trim();
  if (!/^[1-9]\d*$/.test(normalized)) {
    errors.push(`${field} must be a positive integer`);
    return defaultValue;
  }

  const parsed = Number(normalized);
  if (!Number.isSafeInteger(parsed) || parsed > maximum) {
    errors.push(`${field} must be between 1 and ${maximum}`);
    return defaultValue;
  }
  return parsed;
};

const parseOptionalText = (
  value: unknown,
  field: string,
  errors: string[],
  maximumLength = 250
): string | null => {
  if (value === undefined || value === null || value === "") return null;
  if (Array.isArray(value) || typeof value === "object") {
    errors.push(`${field} must be text`);
    return null;
  }
  const normalized = String(value).trim();
  if (!normalized) return null;
  if (normalized.length > maximumLength) {
    errors.push(`${field} must be ${maximumLength} characters or fewer`);
    return null;
  }
  return normalized;
};

const parsePositionSortField = (
  value: unknown,
  errors: string[]
): PositionSortField => {
  if (value === undefined || value === null || value === "") return "positionId";
  if (Array.isArray(value) || typeof value === "object") {
    errors.push(`sortBy must be one of: ${POSITION_SORT_FIELDS.join(", ")}`);
    return "positionId";
  }
  const normalized = String(value).trim();
  if (POSITION_SORT_FIELDS.includes(normalized as PositionSortField)) {
    return normalized as PositionSortField;
  }
  errors.push(`sortBy must be one of: ${POSITION_SORT_FIELDS.join(", ")}`);
  return "positionId";
};

const parsePositionSortDirection = (
  value: unknown,
  errors: string[]
): PositionSortDirection => {
  if (value === undefined || value === null || value === "") return "asc";
  if (Array.isArray(value) || typeof value === "object") {
    errors.push("sortDirection must be asc or desc");
    return "asc";
  }
  const normalized = String(value).trim().toLowerCase();
  if (normalized === "asc" || normalized === "desc") return normalized;
  errors.push("sortDirection must be asc or desc");
  return "asc";
};

const parsePositiveBigInt = (
  value: unknown,
  field: string,
  errors: string[]
): string => {
  const normalized = Array.isArray(value) || value === null || value === undefined
    ? ""
    : String(value).trim();
  if (!/^[1-9]\d*$/.test(normalized)) {
    errors.push(`${field} must be a positive integer`);
    return "0";
  }
  try {
    if (BigInt(normalized) > 9223372036854775807n) {
      errors.push(`${field} exceeds the SQL bigint range`);
      return "0";
    }
  } catch (_error) {
    errors.push(`${field} must be a positive integer`);
    return "0";
  }
  return normalized;
};

const parseOptionalDate = (
  value: unknown,
  field: string,
  errors: string[]
): string | null => {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value.trim())) {
    errors.push(`${field} must use YYYY-MM-DD format`);
    return null;
  }
  const normalized = value.trim();
  const [year, month, day] = normalized.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year
    || date.getUTCMonth() !== month - 1
    || date.getUTCDate() !== day
  ) {
    errors.push(`${field} must be a valid calendar date`);
    return null;
  }
  return normalized;
};

export const parsePositionListQuery = (
  source: Record<string, unknown>
): ValidationResult<PositionListQuery> => {
  const errors: string[] = [];
  const page = parsePageValue(source.page, "page", errors, 1, Number.MAX_SAFE_INTEGER);
  const pageSize = parsePageValue(
    source.pageSize,
    "pageSize",
    errors,
    POSITION_DEFAULT_PAGE_SIZE,
    POSITION_MAX_PAGE_SIZE
  );

  let jobId: number | null = null;
  if (source.jobId !== undefined && source.jobId !== null && source.jobId !== "") {
    jobId = parsePositiveInteger(source.jobId, "jobId", errors) || null;
  }

  const search = parseOptionalText(source.search, "search", errors);
  const positionType = parseOptionalText(source.positionType, "positionType", errors, 50);
  const status = parseOptionalText(source.status, "status", errors, 50);
  const rawOccupancy = source.occupancy === undefined || source.occupancy === null || source.occupancy === ""
    ? "all"
    : String(source.occupancy).trim().toLowerCase();
  let occupancy: PositionListQuery["occupancy"] = "all";
  if (["all", "occupied", "vacant"].includes(rawOccupancy)) {
    occupancy = rawOccupancy as PositionListQuery["occupancy"];
  } else {
    errors.push("occupancy must be all, occupied, or vacant");
  }
  const sortBy = parsePositionSortField(source.sortBy, errors);
  const sortDirection = parsePositionSortDirection(source.sortDirection, errors);

  return errors.length
    ? { success: false, errors }
    : {
        success: true,
        value: {
          page,
          pageSize,
          jobId,
          search,
          occupancy,
          positionType,
          status,
          sortBy,
          sortDirection
        }
      };
};

export const validateCreatePositionPayload = (
  source: Record<string, unknown>
): ValidationResult<CreatePositionPayload> => {
  const errors: string[] = [];
  const value: CreatePositionPayload = {
    positionNumber: parsePositiveBigInt(source.positionNumber, "positionNumber", errors),
    positionType: parseOptionalText(source.positionType, "positionType", errors, 50),
    positionLevel: parseOptionalText(source.positionLevel, "positionLevel", errors, 50),
    positionDegree: parseOptionalText(source.positionDegree, "positionDegree", errors, 50),
    positionDateCreation: parseOptionalDate(
      source.positionDateCreation,
      "positionDateCreation",
      errors
    ),
    status: parseOptionalText(source.status, "status", errors, 50),
    jobId: parsePositiveInteger(source.jobId, "jobId", errors, 2147483647)
  };
  return errors.length ? { success: false, errors } : { success: true, value };
};

export const validateAssignPositionPayload = (
  source: Record<string, unknown>
): ValidationResult<AssignPositionPayload> => {
  const errors: string[] = [];
  const value = {
    employeeId: parsePositiveInteger(
      readAlias(source, "employeeId", "EmployeeId"),
      "employeeId",
      errors
    ),
    positionId: parsePositiveInteger(
      readAlias(source, "positionId", "PositionId"),
      "positionId",
      errors
    )
  };
  return errors.length ? { success: false, errors } : { success: true, value };
};

export const validateTransferPositionPayload = (
  source: Record<string, unknown>
): ValidationResult<TransferPositionPayload> => {
  const normalizedSource = hasOwn(source, "positionId") || hasOwn(source, "PositionId")
    ? source
    : {
        ...source,
        positionId: readAlias(source, "newPositionId", "NewPositionId")
      };
  return validateAssignPositionPayload(normalizedSource);
};

export const validateReleasePositionPayload = (
  source: Record<string, unknown>
): ValidationResult<ReleasePositionPayload> => {
  const errors: string[] = [];
  const value = {
    employeeId: parsePositiveInteger(
      readAlias(source, "employeeId", "EmployeeId"),
      "employeeId",
      errors
    )
  };
  return errors.length ? { success: false, errors } : { success: true, value };
};
