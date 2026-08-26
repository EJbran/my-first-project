export const EMPLOYEE_SEARCH_MAX_PAGE_SIZE = 100;
export const EMPLOYEE_SEARCH_DEFAULT_PAGE_SIZE = 10;

export type EmployeeSearchStatus =
  | "employee"
  | "current"
  | "active"
  | "on-leave"
  | "archived"
  | "vacancy"
  | "unknown";

export type EmployeeSearchAgeBand =
  | "under-25"
  | "25-34"
  | "35-44"
  | "45-54"
  | "55-plus"
  | "unknown";

export type EmployeeSearchContractRisk =
  | "expired"
  | "within-30"
  | "within-60"
  | "within-90"
  | "expiring-90"
  | "within-180"
  | "within-365"
  | "over-90"
  | "over-180"
  | "later"
  | "no-end-date";

export type EmployeeSearchMissingField =
  | "job"
  | "department"
  | "work-location"
  | "date-of-birth"
  | "place-of-birth"
  | "family-book-issuer"
  | "nationality"
  | "contract-start"
  | "gender"
  | "invalid-gender"
  | "active-expired-contract"
  | "contract-chronology";

export interface EmployeeSearchQuery {
  page: number;
  pageSize: number;
  showAll: boolean;
  search: string | null;
  employeeNumber: string | null;
  status: EmployeeSearchStatus | null;
  locationId: number | "unassigned" | null;
  departmentId: number | "unassigned" | null;
  jobId: number | "unassigned" | null;
  gender: "male" | "female" | "unknown" | string | null;
  nationality: string | null;
  employeeType: string | null;
  contractType: string | null;
  placeOfBirth: string | null;
  familyBookIssuer: string | null;
  ageMin: number | null;
  ageMax: number | null;
  contractStartFrom: string | null;
  contractStartTo: string | null;
  contractEndFrom: string | null;
  contractEndTo: string | null;
  ageBand: EmployeeSearchAgeBand | null;
  contractRisk: EmployeeSearchContractRisk | null;
  seniorityMilestone: number | null;
  missingField: EmployeeSearchMissingField | null;
  asOf: string | null;
}

export type EmployeeSearchQueryResult =
  | { success: true; value: EmployeeSearchQuery }
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

const normalizeKey = (value: string): string =>
  value.trim().toLocaleLowerCase("en-US").replace(/[_\s]+/g, "-");

const normalizeGenderKey = (value: string): string =>
  value
    .normalize("NFKC")
    .toLocaleLowerCase("en-US")
    .replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED]/g, "")
    .replace(/\u0640/g, "")
    .replace(/[\u0623\u0625\u0622\u0671]/g, "\u0627")
    .replace(/[\u0649\u06CC]/g, "\u064A")
    .replace(/\u0624/g, "\u0648")
    .replace(/\u0626/g, "\u064A")
    .replace(/\u0629/g, "\u0647")
    .replace(/\u06A9/g, "\u0643")
    .replace(/[\u200C\u200D\uFEFF]/g, "")
    .replace(/[_\s]+/g, "-")
    .trim();

const parsePositiveInteger = (
  value: string | null,
  field: string,
  errors: string[],
  defaultValue: number
): number => {
  if (value === null) return defaultValue;
  if (!/^\d+$/.test(value)) {
    errors.push(`${field} must be a positive integer`);
    return defaultValue;
  }

  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    errors.push(`${field} must be a positive integer`);
    return defaultValue;
  }
  return parsed;
};

const parseBoolean = (
  value: string | null,
  field: string,
  errors: string[],
  defaultValue: boolean
): boolean => {
  if (value === null) return defaultValue;
  const normalized = normalizeKey(value);
  if (["true", "1", "yes"].includes(normalized)) return true;
  if (["false", "0", "no"].includes(normalized)) return false;
  errors.push(`${field} must be true or false`);
  return defaultValue;
};

const parseOptionalInteger = (
  value: string | null,
  field: string,
  errors: string[],
  minimum: number,
  maximum: number
): number | null => {
  if (value === null) return null;
  if (!/^\d+$/.test(value)) {
    errors.push(`${field} must be an integer between ${minimum} and ${maximum}`);
    return null;
  }

  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < minimum || parsed > maximum) {
    errors.push(`${field} must be an integer between ${minimum} and ${maximum}`);
    return null;
  }
  return parsed;
};

const parseOptionalReference = (
  value: string | null,
  field: string,
  errors: string[]
): number | "unassigned" | null => {
  if (value === null || normalizeKey(value) === "all") return null;
  if (["unassigned", "unknown", "missing"].includes(normalizeKey(value))) return "unassigned";
  return parseOptionalInteger(value, field, errors, 1, Number.MAX_SAFE_INTEGER);
};

const isValidIsoDate = (value: string): boolean => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year
    && date.getUTCMonth() === month - 1
    && date.getUTCDate() === day;
};

const parseOptionalDate = (
  value: string | null,
  field: string,
  errors: string[]
): string | null => {
  if (value === null) return null;
  if (!isValidIsoDate(value)) {
    errors.push(`${field} must be a valid date in YYYY-MM-DD format`);
    return null;
  }
  return value;
};

const parseOptionalText = (
  value: string | null,
  field: string,
  errors: string[],
  maximum: number
): string | null => {
  if (value === null || normalizeKey(value) === "all") return null;
  if (value.length > maximum) {
    errors.push(`${field} must be ${maximum} characters or fewer`);
    return null;
  }
  return value;
};

const parseStatus = (
  value: string | null,
  errors: string[]
): EmployeeSearchStatus | null => {
  if (value === null) return null;
  const aliases: Record<string, EmployeeSearchStatus | null> = {
    all: null,
    employee: "employee",
    employees: "employee",
    current: "current",
    active: "active",
    "on-leave": "on-leave",
    leave: "on-leave",
    archived: "archived",
    inactive: "archived",
    vacancy: "vacancy",
    vacancies: "vacancy",
    unknown: "unknown"
  };
  const normalized = normalizeKey(value);
  if (Object.prototype.hasOwnProperty.call(aliases, normalized)) return aliases[normalized];
  errors.push("status must be employee, current, active, on-leave, archived, vacancy, unknown, or all");
  return null;
};

const parseGender = (
  value: string | null,
  errors: string[]
): EmployeeSearchQuery["gender"] => {
  const parsed = parseOptionalText(value, "gender", errors, 50);
  if (parsed === null) return null;
  const normalized = normalizeGenderKey(parsed);
  if (["male", "m", "\u0630\u0643\u0631", "\u062f\u0643\u0631"].includes(normalized)) return "male";
  if (["female", "f", "\u0627\u0646\u062b\u064a"].includes(normalized)) return "female";
  if (["unknown", "unassigned", "missing"].includes(normalized)) return "unknown";
  return parsed;
};

const parseAgeBand = (
  value: string | null,
  errors: string[]
): EmployeeSearchAgeBand | null => {
  if (value === null || normalizeKey(value) === "all") return null;
  const aliases: Record<string, EmployeeSearchAgeBand> = {
    "<25": "under-25",
    under25: "under-25",
    "under-25": "under-25",
    "25-34": "25-34",
    "35-44": "35-44",
    "45-54": "45-54",
    "55+": "55-plus",
    "55plus": "55-plus",
    "55-plus": "55-plus",
    unknown: "unknown"
  };
  const parsed = aliases[normalizeKey(value)];
  if (parsed) return parsed;
  errors.push("ageBand must be under-25, 25-34, 35-44, 45-54, 55-plus, or unknown");
  return null;
};

const parseContractRisk = (
  value: string | null,
  errors: string[]
): EmployeeSearchContractRisk | null => {
  if (value === null || normalizeKey(value) === "all") return null;
  const aliases: Record<string, EmployeeSearchContractRisk> = {
    expired: "expired",
    past: "expired",
    overdue: "expired",
    "active-expired": "expired",
    "within-30": "within-30",
    "0-30": "within-30",
    "within-60": "within-60",
    "31-60": "within-60",
    "within-90": "within-90",
    "61-90": "within-90",
    "expiring-90": "expiring-90",
    "within-180": "within-180",
    "91-180": "within-180",
    "within-365": "within-365",
    "181-365": "within-365",
    "over-90": "over-90",
    "90+": "over-90",
    "over-180": "over-180",
    "180+": "over-180",
    later: "later",
    "no-end-date": "no-end-date",
    missing: "no-end-date",
    "no-date": "no-end-date"
  };
  const parsed = aliases[normalizeKey(value)];
  if (parsed) return parsed;
  errors.push("contractRisk is not supported");
  return null;
};

const parseMissingField = (
  value: string | null,
  errors: string[]
): EmployeeSearchMissingField | null => {
  if (value === null || normalizeKey(value) === "all") return null;
  const compact = normalizeKey(value).replace(/-/g, "");
  const aliases: Record<string, EmployeeSearchMissingField> = {
    job: "job",
    department: "department",
    worklocation: "work-location",
    dateofbirth: "date-of-birth",
    placeofbirth: "place-of-birth",
    familybookissuer: "family-book-issuer",
    nationality: "nationality",
    contractstart: "contract-start",
    gender: "gender",
    invalidgender: "invalid-gender",
    activeexpiredcontract: "active-expired-contract",
    contractchronology: "contract-chronology"
  };
  const parsed = aliases[compact];
  if (parsed) return parsed;
  errors.push("missingField is not supported");
  return null;
};

export const parseEmployeeSearchQuery = (
  source: Record<string, unknown>
): EmployeeSearchQueryResult => {
  const errors: string[] = [];
  const read = (key: string) => readSingleQueryValue(source, key, errors);
  const rawSearch = read("search") ?? read("q");
  const search = parseOptionalText(rawSearch, "search", errors, 200);
  if (search && search.split(/\s+/).length > 10) {
    errors.push("search must contain 10 terms or fewer");
  }

  const page = parsePositiveInteger(read("page"), "page", errors, 1);
  const requestedPageSize = parsePositiveInteger(
    read("pageSize"),
    "pageSize",
    errors,
    EMPLOYEE_SEARCH_DEFAULT_PAGE_SIZE
  );
  const pageSize = Math.min(requestedPageSize, EMPLOYEE_SEARCH_MAX_PAGE_SIZE);
  const showAll = parseBoolean(read("showAll"), "showAll", errors, false);

  const ageMin = parseOptionalInteger(read("ageMin"), "ageMin", errors, 0, 150);
  const ageMax = parseOptionalInteger(read("ageMax"), "ageMax", errors, 0, 150);
  if (ageMin !== null && ageMax !== null && ageMin > ageMax) {
    errors.push("ageMin cannot be greater than ageMax");
  }

  const contractStartFrom = parseOptionalDate(read("contractStartFrom"), "contractStartFrom", errors);
  const contractStartTo = parseOptionalDate(read("contractStartTo"), "contractStartTo", errors);
  const contractEndFrom = parseOptionalDate(read("contractEndFrom"), "contractEndFrom", errors);
  const contractEndTo = parseOptionalDate(read("contractEndTo"), "contractEndTo", errors);
  const asOf = parseOptionalDate(read("asOf"), "asOf", errors);

  if (contractStartFrom && contractStartTo && contractStartFrom > contractStartTo) {
    errors.push("contractStartFrom cannot be after contractStartTo");
  }
  if (contractEndFrom && contractEndTo && contractEndFrom > contractEndTo) {
    errors.push("contractEndFrom cannot be after contractEndTo");
  }

  const seniorityText = read("seniorityMilestone");
  let seniorityMilestone: number | null = null;
  if (seniorityText !== null && normalizeKey(seniorityText) !== "all") {
    const match = /^(\d+)(?:-(?:year|years))?$/.exec(normalizeKey(seniorityText));
    seniorityMilestone = match
      ? parseOptionalInteger(match[1], "seniorityMilestone", errors, 1, 100)
      : null;
    if (!match) errors.push("seniorityMilestone must be a number from 1 to 100");
  }

  const value: EmployeeSearchQuery = {
    page,
    pageSize,
    showAll,
    search,
    employeeNumber: parseOptionalText(read("employeeNumber"), "employeeNumber", errors, 50),
    status: parseStatus(read("status"), errors),
    locationId: parseOptionalReference(read("locationId"), "locationId", errors),
    departmentId: parseOptionalReference(read("departmentId"), "departmentId", errors),
    jobId: parseOptionalReference(read("jobId"), "jobId", errors),
    gender: parseGender(read("gender"), errors),
    nationality: parseOptionalText(read("nationality"), "nationality", errors, 150),
    employeeType: parseOptionalText(read("employeeType"), "employeeType", errors, 150),
    contractType: parseOptionalText(read("contractType"), "contractType", errors, 150),
    placeOfBirth: parseOptionalText(read("placeOfBirth"), "placeOfBirth", errors, 150),
    familyBookIssuer: parseOptionalText(read("familyBookIssuer"), "familyBookIssuer", errors, 200),
    ageMin,
    ageMax,
    contractStartFrom,
    contractStartTo,
    contractEndFrom,
    contractEndTo,
    ageBand: parseAgeBand(read("ageBand"), errors),
    contractRisk: parseContractRisk(read("contractRisk"), errors),
    seniorityMilestone,
    missingField: parseMissingField(read("missingField"), errors),
    asOf
  };

  return errors.length > 0
    ? { success: false, errors: [...new Set(errors)] }
    : { success: true, value };
};
