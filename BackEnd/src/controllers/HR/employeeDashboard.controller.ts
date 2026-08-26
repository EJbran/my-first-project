import type { NextFunction, Request, Response } from "express";
import { QueryTypes } from "sequelize";

const { sequelize } = require("../../config/database");

type DashboardRow = {
  ID_Employee: unknown;
  Ref_Employee: unknown;
  EmployeeName: unknown;
  EmployeeName_En: unknown;
  Gender: unknown;
  Nationality: unknown;
  DateOFBirth: unknown;
  PlaceOFBirth: unknown;
  FamilyBook_Issuer: unknown;
  State: unknown;
  Contract_Type: unknown;
  Type_Employee: unknown;
  Degree_Employee: unknown;
  Start_of_Contract: unknown;
  End_of_contrat: unknown;
  Department_Id: unknown;
  DepartmentName_Arabic: unknown;
  DepartmentName_English: unknown;
  Location_Id: unknown;
  LocationName_ar: unknown;
  LocationName_en: unknown;
  Job_Id: unknown;
  Job_Name: unknown;
};

type DashboardReadinessRow = {
  ExperienceRows: unknown;
  TimeSheetRows: unknown;
  TimeSheetCodeRows: unknown;
  VacationRows: unknown;
};

type CalendarDate = {
  year: number;
  month: number;
  day: number;
};

type EmployeeKind = "employee" | "vacancy" | "unknown";
type EmploymentStatus = "active" | "archived" | "vacancy" | "unknown";
type GenderCategory = "male" | "female" | "unknown";

type Category = {
  value: string;
  label: string;
};

type DashboardRecordQuality = {
  employeeNumberPresent: boolean;
  employeeNamePresent: boolean;
  genderPresent: boolean;
  nationalityPresent: boolean;
  birthDatePresent: boolean;
  placeOfBirthPresent: boolean;
  familyBookIssuerPresent: boolean;
  contractTypePresent: boolean;
  gradePresent: boolean;
  contractStartPresent: boolean;
  contractEndPresent: boolean;
  departmentIdPresent: boolean;
  departmentResolved: boolean;
  workLocationIdPresent: boolean;
  workLocationResolved: boolean;
  jobIdPresent: boolean;
  jobResolved: boolean;
};

type DashboardRecord = {
  employeeId: number | null;
  employeeNumber: string;
  kind: EmployeeKind;
  status: EmploymentStatus;
  employeeName: string;
  gender: GenderCategory;
  nationality: Category;
  nationalityKey: string | null;
  birthDate: CalendarDate | null;
  placeOfBirth: Category;
  familyBookIssuer: Category;
  contractType: Category;
  employeeType: Category;
  grade: Category;
  contractStart: CalendarDate | null;
  contractEnd: CalendarDate | null;
  department: Category;
  workLocation: Category;
  job: Category;
  jobName: string;
  quality: DashboardRecordQuality;
};

type FilterOption = {
  value: string;
  label: string;
  count: number;
};

type CategorySeriesItem = {
  key?: string;
  label: string;
  value: number;
};

type AppliedFilters = {
  status: string | null;
  department: string | null;
  workLocation: string | null;
  gender: string | null;
  contractType: string | null;
  employeeType: string | null;
  job: string | null;
  nationality: string | null;
  ageBand: string | null;
  contractRisk: string | null;
  seniorityMilestone: string | null;
};

type ContractRiskKey =
  | "expired"
  | "within-30"
  | "within-60"
  | "within-90"
  | "within-180"
  | "later"
  | "no-end-date";

type ContractRiskDefinition = {
  key: ContractRiskKey;
  label: string;
  fromDays: number | null;
  toDays: number | null;
  exposed: boolean;
};

type ContractRiskClassification = ContractRiskDefinition & {
  daysRemaining: number | null;
};

const DASHBOARD_TIME_ZONE = "Africa/Tripoli";
const DAY_IN_MILLISECONDS = 86_400_000;
const SENIORITY_FORECAST_MONTHS = 12;
const PRIVACY_SMALL_GROUP_THRESHOLD = 5;
const SENIORITY_REWARD_SCHEDULE = [
  { years: 5, rewardAmount: 1_500 },
  { years: 10, rewardAmount: 3_500 },
  { years: 15, rewardAmount: 6_000 },
  { years: 20, rewardAmount: 9_000 },
  { years: 25, rewardAmount: 12_500 },
  { years: 30, rewardAmount: 16_500 },
  { years: 35, rewardAmount: 21_000 },
  { years: 40, rewardAmount: 26_000 },
  { years: 45, rewardAmount: 31_500 },
  { years: 50, rewardAmount: 37_500 }
] as const;

const AGE_BANDS = [
  { value: "under-25", label: "<25", minimum: 0, maximum: 25 },
  { value: "25-34", label: "25-34", minimum: 25, maximum: 35 },
  { value: "35-44", label: "35-44", minimum: 35, maximum: 45 },
  { value: "45-54", label: "45-54", minimum: 45, maximum: 55 },
  { value: "55-plus", label: "55+", minimum: 55, maximum: Number.POSITIVE_INFINITY }
] as const;

const CONTRACT_RISK_DEFINITIONS: readonly ContractRiskDefinition[] = [
  { key: "expired", label: "Expired", fromDays: null, toDays: -1, exposed: true },
  { key: "within-30", label: "Due in 0-30 days", fromDays: 0, toDays: 30, exposed: true },
  { key: "within-60", label: "Due in 31-60 days", fromDays: 31, toDays: 60, exposed: true },
  { key: "within-90", label: "Due in 61-90 days", fromDays: 61, toDays: 90, exposed: true },
  { key: "within-180", label: "Due in 91-180 days", fromDays: 91, toDays: 180, exposed: true },
  { key: "later", label: "More than 180 days", fromDays: 181, toDays: null, exposed: false },
  { key: "no-end-date", label: "No contract end date", fromDays: null, toDays: null, exposed: false }
] as const;

const dashboardEmployeeQuery = `
  SELECT
    employee.[ID_Employee],
    employee.[Ref_Employee],
    employee.[EmployeeName],
    employee.[EmployeeName_En],
    employee.[Gender],
    employee.[Nationality],
    employee.[DateOFBirth],
    employee.[PlaceOFBirth],
    employee.[FamilyBook_Issuer],
    employee.[State],
    employee.[Contract_Type],
    employee.[Type_Employee],
    employee.[Degree_Employee],
    employee.[Start_of_Contract],
    employee.[End_of_contrat],
    employee.[Department_Id],
    department.[DepartmentName_Arabic],
    department.[DepartmentName_English],
    employee.[Location_Id],
    location.[LocationName_ar],
    location.[LocationName_en],
    currentPosition.[Job_ID] AS [Job_Id],
    COALESCE(currentJob.[Job_Name_EN], currentJob.[Job_Name_AR]) AS [Job_Name]
  FROM [dbo].[employee] AS employee
  LEFT JOIN [dbo].[Departments] AS department
    ON employee.[Department_Id] = department.[Id]
  LEFT JOIN [dbo].[Location] AS location
    ON employee.[Location_Id] = location.[ID_Location]
  LEFT JOIN [dbo].[Position] AS currentPosition
    ON currentPosition.[EmployeeId] = employee.[ID_Employee]
  LEFT JOIN [dbo].[jobs] AS currentJob
    ON currentJob.[Job_ID] = currentPosition.[Job_ID]
  WHERE
    TRY_CONVERT(decimal(38,10), NULLIF(LTRIM(RTRIM(CONVERT(nvarchar(100), employee.[Ref_Employee]))), N'')) IS NULL
    OR TRY_CONVERT(decimal(38,10), NULLIF(LTRIM(RTRIM(CONVERT(nvarchar(100), employee.[Ref_Employee]))), N'')) <> 0

  UNION ALL

  SELECT
    -vacancy.[Id] AS [ID_Employee],
    CAST(0 AS nvarchar(50)) AS [Ref_Employee],
    CAST(N'Vacant Position' AS nvarchar(100)) AS [EmployeeName],
    CAST(N'Vacant Position' AS nvarchar(100)) AS [EmployeeName_En],
    CAST(NULL AS nvarchar(20)) AS [Gender],
    CAST(NULL AS nvarchar(100)) AS [Nationality],
    CAST(NULL AS date) AS [DateOFBirth],
    CAST(NULL AS nvarchar(100)) AS [PlaceOFBirth],
    CAST(NULL AS nvarchar(150)) AS [FamilyBook_Issuer],
    CAST(NULL AS bit) AS [State],
    CAST(NULL AS nvarchar(100)) AS [Contract_Type],
    CAST(NULL AS nvarchar(100)) AS [Type_Employee],
    CAST(NULL AS nvarchar(100)) AS [Degree_Employee],
    CAST(NULL AS date) AS [Start_of_Contract],
    CAST(NULL AS date) AS [End_of_contrat],
    CAST(NULL AS int) AS [Department_Id],
    CAST(NULL AS nvarchar(200)) AS [DepartmentName_Arabic],
    CAST(NULL AS nvarchar(200)) AS [DepartmentName_English],
    CAST(NULL AS int) AS [Location_Id],
    CAST(NULL AS nvarchar(200)) AS [LocationName_ar],
    CAST(NULL AS nvarchar(200)) AS [LocationName_en],
    vacancy.[Job_ID] AS [Job_Id],
    COALESCE(job.[Job_Name_EN], job.[Job_Name_AR]) AS [Job_Name]
  FROM [dbo].[Position] AS vacancy
  LEFT JOIN [dbo].[jobs] AS job
    ON vacancy.[Job_ID] = job.[Job_ID]
  WHERE vacancy.[EmployeeId] IS NULL;
`;

const dashboardReadinessQuery = `
  SELECT
    COALESCE(SUM(CASE WHEN tableInfo.[name] = 'Experience' AND partitionInfo.[index_id] IN (0, 1) THEN partitionInfo.[rows] ELSE 0 END), 0) AS [ExperienceRows],
    COALESCE(SUM(CASE WHEN tableInfo.[name] = 'TimeSheet' AND partitionInfo.[index_id] IN (0, 1) THEN partitionInfo.[rows] ELSE 0 END), 0) AS [TimeSheetRows],
    COALESCE(SUM(CASE WHEN tableInfo.[name] = 'TimeSheetCode' AND partitionInfo.[index_id] IN (0, 1) THEN partitionInfo.[rows] ELSE 0 END), 0) AS [TimeSheetCodeRows],
    COALESCE(SUM(CASE WHEN tableInfo.[name] = 'Vacation' AND partitionInfo.[index_id] IN (0, 1) THEN partitionInfo.[rows] ELSE 0 END), 0) AS [VacationRows]
  FROM [sys].[tables] AS tableInfo
  INNER JOIN [sys].[schemas] AS schemaInfo
    ON schemaInfo.[schema_id] = tableInfo.[schema_id]
  LEFT JOIN [sys].[partitions] AS partitionInfo
    ON partitionInfo.[object_id] = tableInfo.[object_id]
  WHERE schemaInfo.[name] = 'dbo';
`;

const toText = (value: unknown): string => {
  if (value === null || value === undefined) return "";
  return String(value).trim();
};

const normalizeText = (value: unknown): string =>
  toText(value)
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
    .replace(/\s+/g, " ")
    .trim();

const toFiniteNumber = (value: unknown): number | null => {
  if (value === null || value === undefined || toText(value) === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

const toBooleanState = (value: unknown): boolean | null => {
  if (value === true || value === 1) return true;
  if (value === false || value === 0) return false;

  const normalized = normalizeText(value);
  if (["1", "true"].includes(normalized)) return true;
  if (["0", "false"].includes(normalized)) return false;
  return null;
};

const isLeapYear = (year: number): boolean =>
  year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);

const daysInMonth = (year: number, month: number): number => {
  if (month === 2) return isLeapYear(year) ? 29 : 28;
  return [4, 6, 9, 11].includes(month) ? 30 : 31;
};

const isValidCalendarDate = ({ year, month, day }: CalendarDate): boolean =>
  year >= 1
  && year <= 9999
  && month >= 1
  && month <= 12
  && day >= 1
  && day <= daysInMonth(year, month);

const parseCalendarDate = (value: unknown): CalendarDate | null => {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const parsed = {
      year: value.getUTCFullYear(),
      month: value.getUTCMonth() + 1,
      day: value.getUTCDate()
    };
    return isValidCalendarDate(parsed) ? parsed : null;
  }

  const match = /^(\d{4})-(\d{2})-(\d{2})(?:$|T|\s)/.exec(toText(value));
  if (!match) return null;

  const parsed = {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3])
  };
  return isValidCalendarDate(parsed) ? parsed : null;
};

const padDatePart = (value: number): string => String(value).padStart(2, "0");

const formatCalendarDate = (value: CalendarDate): string =>
  `${String(value.year).padStart(4, "0")}-${padDatePart(value.month)}-${padDatePart(value.day)}`;

const calendarDateToTimestamp = (value: CalendarDate): number =>
  Date.UTC(value.year, value.month - 1, value.day);

const compareCalendarDates = (left: CalendarDate, right: CalendarDate): number =>
  calendarDateToTimestamp(left) - calendarDateToTimestamp(right);

const addCalendarDays = (value: CalendarDate, days: number): CalendarDate => {
  const date = new Date(calendarDateToTimestamp(value));
  date.setUTCDate(date.getUTCDate() + days);
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate()
  };
};

const addCalendarMonths = (value: CalendarDate, months: number): CalendarDate => {
  const monthIndex = (value.year * 12) + (value.month - 1) + months;
  const year = Math.floor(monthIndex / 12);
  const month = (monthIndex % 12) + 1;
  return {
    year,
    month,
    day: Math.min(value.day, daysInMonth(year, month))
  };
};

const addCalendarYears = (value: CalendarDate, years: number): CalendarDate => {
  const year = value.year + years;
  return {
    year,
    month: value.month,
    day: Math.min(value.day, daysInMonth(year, value.month))
  };
};

const calendarDaysBetween = (start: CalendarDate, end: CalendarDate): number =>
  Math.round((calendarDateToTimestamp(end) - calendarDateToTimestamp(start)) / DAY_IN_MILLISECONDS);

const completeCalendarMonths = (start: CalendarDate, end: CalendarDate): number | null => {
  if (compareCalendarDates(start, end) > 0) return null;

  let months = ((end.year - start.year) * 12) + (end.month - start.month);
  if (end.day < Math.min(start.day, daysInMonth(end.year, end.month))) {
    months -= 1;
  }
  return Math.max(0, months);
};

const currentCalendarDate = (): CalendarDate => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: DASHBOARD_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(new Date());
  const values = new Map(parts.map((part) => [part.type, part.value]));

  return {
    year: Number(values.get("year")),
    month: Number(values.get("month")),
    day: Number(values.get("day"))
  };
};

const readQueryValue = (value: unknown): string | null => {
  const candidate = Array.isArray(value) ? value[0] : value;
  const text = toText(candidate);
  return text ? text : null;
};

const readAsOfDate = (value: unknown): CalendarDate => {
  const queryValue = readQueryValue(value);
  if (!queryValue) return currentCalendarDate();

  const parsed = parseCalendarDate(queryValue);
  if (!parsed || formatCalendarDate(parsed) !== queryValue) {
    throw new Error("Invalid dashboard asOf date; expected YYYY-MM-DD");
  }
  return parsed;
};

const normalizeGender = (value: unknown): GenderCategory => {
  const normalized = normalizeText(value);
  if (["\u0630\u0643\u0631", "\u062f\u0643\u0631", "male", "m"].includes(normalized)) return "male";
  if (["\u0627\u0646\u062b\u064A", "female", "f"].includes(normalized)) return "female";
  return "unknown";
};

const genderLabel = (gender: GenderCategory): string => {
  if (gender === "male") return "Male";
  if (gender === "female") return "Female";
  return "Unknown";
};

const normalizeContractType = (value: unknown): Category => {
  const raw = toText(value);
  const normalized = normalizeText(value);
  if (!normalized) return { value: "unknown", label: "Unknown" };
  if (normalized === "\u0633\u0646\u0648\u064A") return { value: "annual", label: "Annual" };
  if (normalized === "\u062F\u0648\u0627\u0645 \u0643\u0627\u0645\u0644") return { value: "full-time", label: "Full-time" };
  if (normalized.includes("\u062A\u062F\u0631\u064A\u0628")) return { value: "training", label: "Training" };
  if (normalized.includes("\u0645\u0648\u0642\u062A") || normalized.includes("\u0645\u0648\u0641\u062A")) {
    return { value: "fixed-term", label: "Fixed-term" };
  }
  if (
    normalized.includes("\u0631\u0628\u0637")
    || normalized.includes("\u0631\u064A\u0637")
    || normalized.includes("\u0636\u0645 \u0645\u062F\u0647")
  ) {
    return { value: "service-linked", label: "Service-linked / Other" };
  }
  return { value: `other:${normalized}`, label: raw || "Other" };
};

const normalizeGenericCategory = (value: unknown, unknownLabel = "Unknown"): Category => {
  const raw = toText(value);
  const normalized = normalizeText(value);
  return normalized
    ? { value: normalized, label: raw }
    : { value: "unknown", label: unknownLabel };
};

const libyanNationalityValues = new Set([
  "libya",
  "libyan",
  "\u0644\u064A\u0628\u064A",
  "\u0644\u064A\u0628\u064A\u0647",
  "\u0644\u064A\u0628\u064A\u0627"
]);

const normalizeNationalityCategory = (value: unknown): Category => {
  const category = normalizeGenericCategory(value, "Unknown");
  if (libyanNationalityValues.has(category.value)) {
    return { value: "libya", label: "Libyan" };
  }
  return category;
};

const unrecordedLocationValues = new Set([
  "unknown",
  "none",
  "null",
  "n/a",
  "na",
  "\u0644\u0627 \u064A\u0648\u062C\u062F",
  "\u063A\u064A\u0631 \u0645\u0639\u0644\u0648\u0645",
  "\u063A\u064A\u0631 \u0645\u0639\u0631\u0648\u0641"
]);

const normalizeLocationCategory = (value: unknown): Category => {
  const raw = toText(value);
  const normalized = normalizeText(value);
  const containsLetter = /\p{L}/u.test(normalized);

  if (!normalized || !containsLetter || unrecordedLocationValues.has(normalized)) {
    return { value: "unknown", label: "Not recorded" };
  }

  return { value: normalized, label: raw };
};

const referenceKind = (value: unknown): EmployeeKind => {
  const reference = toText(value);
  if (!reference) return "unknown";

  const numericReference = Number(reference);
  if (Number.isFinite(numericReference) && numericReference === 0) return "vacancy";
  return "employee";
};

const employmentStatus = (kind: EmployeeKind, value: unknown): EmploymentStatus => {
  if (kind === "vacancy") return "vacancy";
  if (kind === "unknown") return "unknown";

  const state = toBooleanState(value);
  if (state === true) return "active";
  if (state === false) return "archived";
  return "unknown";
};

const identifierCategory = (
  idValue: unknown,
  englishNameValue: unknown,
  arabicNameValue: unknown,
  fallbackPrefix: string
): Category => {
  const id = toFiniteNumber(idValue);
  if (id === null) return { value: "unassigned", label: "Unassigned" };

  const label = toText(englishNameValue) || toText(arabicNameValue) || `${fallbackPrefix} #${id}`;
  return { value: String(id), label };
};

const linkedJobCategory = (idValue: unknown, nameValue: unknown): Category => {
  const id = toFiniteNumber(idValue);
  const raw = toText(nameValue);
  if (id === null || !raw) return { value: "unassigned", label: "Unassigned" };
  return { value: String(id), label: raw };
};

const toDashboardRecord = (row: DashboardRow): DashboardRecord => {
  const kind = referenceKind(row.Ref_Employee);
  const employeeNumber = toText(row.Ref_Employee);
  const employeeName = toText(row.EmployeeName_En) || toText(row.EmployeeName);
  const nationality = normalizeNationalityCategory(row.Nationality);
  const birthDate = parseCalendarDate(row.DateOFBirth);
  const placeOfBirth = normalizeLocationCategory(row.PlaceOFBirth);
  const familyBookIssuer = normalizeLocationCategory(row.FamilyBook_Issuer);
  const contractType = normalizeContractType(row.Contract_Type);
  const grade = normalizeGenericCategory(row.Degree_Employee, "Not recorded");
  const contractStart = parseCalendarDate(row.Start_of_Contract);
  const contractEnd = parseCalendarDate(row.End_of_contrat);
  const departmentIdPresent = toFiniteNumber(row.Department_Id) !== null;
  const workLocationIdPresent = toFiniteNumber(row.Location_Id) !== null;
  const jobIdPresent = toFiniteNumber(row.Job_Id) !== null;
  const departmentResolved = departmentIdPresent
    && Boolean(toText(row.DepartmentName_English) || toText(row.DepartmentName_Arabic));
  const workLocationResolved = workLocationIdPresent
    && Boolean(toText(row.LocationName_en) || toText(row.LocationName_ar));
  const jobResolved = jobIdPresent && Boolean(toText(row.Job_Name));

  return {
    employeeId: toFiniteNumber(row.ID_Employee),
    employeeNumber,
    kind,
    status: employmentStatus(kind, row.State),
    employeeName: employeeName || "Employee",
    gender: normalizeGender(row.Gender),
    nationality,
    nationalityKey: nationality.value === "unknown" ? null : nationality.value,
    birthDate,
    placeOfBirth,
    familyBookIssuer,
    contractType,
    employeeType: normalizeGenericCategory(row.Type_Employee),
    grade,
    contractStart,
    contractEnd,
    department: identifierCategory(
      row.Department_Id,
      row.DepartmentName_English,
      row.DepartmentName_Arabic,
      "Department"
    ),
    workLocation: identifierCategory(row.Location_Id, row.LocationName_en, row.LocationName_ar, "Location"),
    job: linkedJobCategory(row.Job_Id, row.Job_Name),
    jobName: toText(row.Job_Name) || "Unassigned",
    quality: {
      employeeNumberPresent: Boolean(employeeNumber),
      employeeNamePresent: Boolean(employeeName),
      genderPresent: Boolean(toText(row.Gender)),
      nationalityPresent: Boolean(toText(row.Nationality)),
      birthDatePresent: Boolean(toText(row.DateOFBirth)),
      placeOfBirthPresent: Boolean(toText(row.PlaceOFBirth)),
      familyBookIssuerPresent: Boolean(toText(row.FamilyBook_Issuer)),
      contractTypePresent: Boolean(toText(row.Contract_Type)),
      gradePresent: Boolean(toText(row.Degree_Employee)),
      contractStartPresent: Boolean(toText(row.Start_of_Contract)),
      contractEndPresent: Boolean(toText(row.End_of_contrat)),
      departmentIdPresent,
      departmentResolved,
      workLocationIdPresent,
      workLocationResolved,
      jobIdPresent,
      jobResolved
    }
  };
};

const increment = (counts: Map<string, number>, key: string): void => {
  counts.set(key, (counts.get(key) ?? 0) + 1);
};

const countCategoryOptions = (
  records: DashboardRecord[],
  selectCategory: (record: DashboardRecord) => Category
): FilterOption[] => {
  const categories = new Map<string, { labelCounts: Map<string, number>; count: number }>();
  for (const record of records) {
    const category = selectCategory(record);
    const current = categories.get(category.value);
    const labelCounts = current?.labelCounts ?? new Map<string, number>();
    labelCounts.set(category.label, (labelCounts.get(category.label) ?? 0) + 1);
    categories.set(category.value, {
      labelCounts,
      count: (current?.count ?? 0) + 1
    });
  }

  return Array.from(categories, ([value, category]) => {
    const label = Array.from(category.labelCounts.entries())
      .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))[0]?.[0] ?? "Unknown";
    return { value, label, count: category.count };
  })
    .sort((left, right) => right.count - left.count || left.label.localeCompare(right.label));
};

const toCategorySeries = (options: FilterOption[]): CategorySeriesItem[] =>
  options.map(({ value, label, count }) => ({ key: value, label, value: count }));

const roundOneDecimal = (value: number): number => Math.round(value * 10) / 10;
const roundTwoDecimals = (value: number): number => Math.round(value * 100) / 100;

const averageYears = (
  records: DashboardRecord[],
  selectDate: (record: DashboardRecord) => CalendarDate | null,
  asOf: CalendarDate
): number | null => {
  const months = records
    .map((record) => selectDate(record))
    .filter((date): date is CalendarDate => Boolean(date))
    .map((date) => completeCalendarMonths(date, asOf))
    .filter((value): value is number => value !== null);

  if (months.length === 0) return null;
  return roundOneDecimal(months.reduce((sum, value) => sum + value, 0) / months.length / 12);
};

const ageBandCategory = (record: DashboardRecord, asOf: CalendarDate): Category => {
  if (!record.birthDate) return { value: "unknown", label: "Unknown" };
  const ageMonths = completeCalendarMonths(record.birthDate, asOf);
  if (ageMonths === null) return { value: "unknown", label: "Unknown" };
  const age = Math.floor(ageMonths / 12);
  const band = AGE_BANDS.find((candidate) => age >= candidate.minimum && age < candidate.maximum);
  return band
    ? { value: band.value, label: band.label }
    : { value: "unknown", label: "Unknown" };
};

const hasInvalidContractChronology = (record: DashboardRecord): boolean =>
  Boolean(
    record.contractStart
    && record.contractEnd
    && compareCalendarDates(record.contractEnd, record.contractStart) < 0
  );

const classifyContractRisk = (
  record: DashboardRecord,
  asOf: CalendarDate
): ContractRiskClassification | null => {
  if (record.status !== "active" || hasInvalidContractChronology(record)) return null;

  if (!record.contractEnd) {
    const definition = CONTRACT_RISK_DEFINITIONS.find((candidate) => candidate.key === "no-end-date") as ContractRiskDefinition;
    return { ...definition, daysRemaining: null };
  }

  const daysRemaining = calendarDaysBetween(asOf, record.contractEnd);
  const definition = CONTRACT_RISK_DEFINITIONS.find((candidate) => {
    if (candidate.key === "no-end-date") return false;
    const aboveMinimum = candidate.fromDays === null || daysRemaining >= candidate.fromDays;
    const belowMaximum = candidate.toDays === null || daysRemaining <= candidate.toDays;
    return aboveMinimum && belowMaximum;
  });

  return definition ? { ...definition, daysRemaining } : null;
};

const isSeniorityMilestoneDue = (
  record: DashboardRecord,
  years: number,
  asOf: CalendarDate,
  windowMonths = SENIORITY_FORECAST_MONTHS
): boolean => {
  if (record.status !== "active" || !record.contractStart) return false;
  if (compareCalendarDates(record.contractStart, asOf) > 0) return false;
  if (!SENIORITY_REWARD_SCHEDULE.some((milestone) => milestone.years === years)) return false;

  const milestoneDate = addCalendarYears(record.contractStart, years);
  const windowEnd = addCalendarMonths(asOf, windowMonths);
  return compareCalendarDates(milestoneDate, asOf) >= 0
    && compareCalendarDates(milestoneDate, windowEnd) < 0;
};

const normalizeFilterValue = (value: unknown): string | null => {
  const queryValue = readQueryValue(value);
  if (!queryValue || normalizeText(queryValue) === "all") return null;
  return normalizeText(queryValue);
};

const readAppliedFilters = (req: Request): AppliedFilters => {
  return {
    status: normalizeFilterValue(req.query.status),
    department: normalizeFilterValue(req.query.department),
    workLocation: normalizeFilterValue(req.query.workLocation ?? req.query.locationId),
    gender: normalizeFilterValue(req.query.gender),
    contractType: normalizeFilterValue(req.query.contractType),
    employeeType: normalizeFilterValue(req.query.employeeType),
    job: normalizeFilterValue(req.query.job),
    nationality: normalizeFilterValue(req.query.nationality),
    ageBand: normalizeFilterValue(req.query.ageBand),
    contractRisk: normalizeFilterValue(req.query.contractRisk),
    seniorityMilestone: normalizeFilterValue(req.query.seniorityMilestone)
  };
};

const matchesFilters = (record: DashboardRecord, filters: AppliedFilters, asOf: CalendarDate): boolean =>
  (!filters.status || record.status === filters.status)
  && (!filters.department || normalizeText(record.department.value) === filters.department)
  && (!filters.workLocation || normalizeText(record.workLocation.value) === filters.workLocation)
  && (!filters.gender || record.gender === filters.gender)
  && (!filters.contractType || normalizeText(record.contractType.value) === filters.contractType)
  && (!filters.employeeType || normalizeText(record.employeeType.value) === filters.employeeType)
  && (!filters.job || normalizeText(record.job.value) === filters.job)
  && (!filters.nationality || normalizeText(record.nationality.value) === filters.nationality)
  && (!filters.ageBand || ageBandCategory(record, asOf).value === filters.ageBand)
  && (!filters.contractRisk || classifyContractRisk(record, asOf)?.key === filters.contractRisk)
  && (
    !filters.seniorityMilestone
    || isSeniorityMilestoneDue(record, Number(filters.seniorityMilestone), asOf)
  );

const buildContractStartTrend = (records: DashboardRecord[], asOf: CalendarDate): CategorySeriesItem[] => {
  const firstCurrentMonth = { year: asOf.year, month: asOf.month, day: 1 };
  const firstMonth = addCalendarMonths(firstCurrentMonth, -11);
  const labelFormatter = new Intl.DateTimeFormat("en-US", {
    month: "short",
    year: "numeric",
    timeZone: "UTC"
  });

  return Array.from({ length: 12 }, (_, index) => {
    const monthStart = addCalendarMonths(firstMonth, index);
    const nextMonth = addCalendarMonths(monthStart, 1);
    const value = records.filter((record) => {
      const start = record.contractStart;
      return start
        && compareCalendarDates(start, monthStart) >= 0
        && compareCalendarDates(start, nextMonth) < 0
        && compareCalendarDates(start, asOf) <= 0;
    }).length;

    return {
      label: labelFormatter.format(new Date(calendarDateToTimestamp(monthStart))),
      value
    };
  });
};

const buildAgePyramid = (records: DashboardRecord[], asOf: CalendarDate) => {
  return AGE_BANDS.map((band) => {
    const row = { label: band.label, male: 0, female: 0, unknown: 0 };
    for (const record of records) {
      if (!record.birthDate) continue;
      const ageMonths = completeCalendarMonths(record.birthDate, asOf);
      if (ageMonths === null) continue;
      const age = Math.floor(ageMonths / 12);
      if (age < band.minimum || age >= band.maximum) continue;
      row[record.gender] += 1;
    }
    return row;
  });
};

const buildYearsOfService = (records: DashboardRecord[], asOf: CalendarDate): CategorySeriesItem[] => {
  const counts = new Map<string, number>([
    ["<1", 0],
    ["1-3", 0],
    ["3-5", 0],
    ["5-10", 0],
    ["10-20", 0],
    ["20+", 0]
  ]);

  for (const record of records) {
    if (!record.contractStart) continue;
    const months = completeCalendarMonths(record.contractStart, asOf);
    if (months === null) continue;
    const years = Math.floor(months / 12);
    const label = years < 1
      ? "<1"
      : years < 3
        ? "1-3"
        : years < 5
          ? "3-5"
          : years < 10
            ? "5-10"
            : years < 20
              ? "10-20"
              : "20+";
    increment(counts, label);
  }

  return Array.from(counts, ([label, value]) => ({ label, value }));
};

const buildDepartmentGenderComposition = (records: DashboardRecord[]) => {
  const departments = new Map<string, {
    label: string;
    male: number;
    female: number;
    unknown: number;
    total: number;
  }>();

  for (const record of records) {
    const key = record.department.value;
    const current = departments.get(key) ?? {
      label: record.department.label,
      male: 0,
      female: 0,
      unknown: 0,
      total: 0
    };
    current[record.gender] += 1;
    current.total += 1;
    departments.set(key, current);
  }

  return Array.from(departments.values())
    .sort((left, right) => right.total - left.total || left.label.localeCompare(right.label))
    .slice(0, 6);
};

const buildContractRiskItem = (
  record: DashboardRecord,
  risk: ContractRiskClassification
) => ({
  employeeId: record.employeeId ?? undefined,
  employeeName: record.employeeName,
  jobName: record.jobName,
  endDate: record.contractEnd ? formatCalendarDate(record.contractEnd) : "",
  daysRemaining: risk.daysRemaining ?? 0,
  bucket: risk.key
});

const buildContractRisk = (records: DashboardRecord[], asOf: CalendarDate) => {
  const exposedDefinitions = CONTRACT_RISK_DEFINITIONS.filter((definition) => definition.exposed);
  const counts = new Map<ContractRiskKey, number>(
    exposedDefinitions.map((definition) => [definition.key, 0])
  );
  const classifiedRecords: Array<{ record: DashboardRecord; risk: ContractRiskClassification }> = [];
  let validEndDates = 0;

  for (const record of records) {
    const risk = classifyContractRisk(record, asOf);
    if (!risk) continue;
    if (record.contractEnd) validEndDates += 1;
    if (!risk.exposed) continue;
    increment(counts, risk.key);
    classifiedRecords.push({ record, risk });
  }

  const items = classifiedRecords
    .sort((left, right) => {
      const leftDays = left.risk.daysRemaining ?? Number.POSITIVE_INFINITY;
      const rightDays = right.risk.daysRemaining ?? Number.POSITIVE_INFINITY;
      if (left.risk.key === "expired" && right.risk.key === "expired") {
        return rightDays - leftDays || left.record.employeeName.localeCompare(right.record.employeeName);
      }
      return leftDays - rightDays || left.record.employeeName.localeCompare(right.record.employeeName);
    })
    .map(({ record, risk }) => buildContractRiskItem(record, risk));
  const expiredCount = counts.get("expired") ?? 0;

  return {
    available: validEndDates > 0,
    quality: "unverified" as const,
    warning: validEndDates > 0
      ? `${expiredCount} active employee records have contract end dates before the dashboard as-of date. Contract dates are not verified as authoritative.`
      : "No valid active employee contract end dates are available.",
    buckets: exposedDefinitions.map((definition) => ({
      key: definition.key,
      label: definition.label,
      value: counts.get(definition.key) ?? 0,
      fromDays: definition.fromDays,
      toDays: definition.toDays
    })),
    items
  };
};

const countContractsExpiring90Days = (records: DashboardRecord[], asOf: CalendarDate): number =>
  records.filter((record) => {
    const risk = classifyContractRisk(record, asOf);
    return risk && ["within-30", "within-60", "within-90"].includes(risk.key);
  }).length;

const buildUpcomingContractExpirations = (records: DashboardRecord[], asOf: CalendarDate) =>
  records
    .map((record) => ({ record, risk: classifyContractRisk(record, asOf) }))
    .filter((entry): entry is { record: DashboardRecord; risk: ContractRiskClassification } =>
      Boolean(entry.risk && ["within-30", "within-60", "within-90"].includes(entry.risk.key))
    )
    .sort((left, right) =>
      (left.risk.daysRemaining ?? 0) - (right.risk.daysRemaining ?? 0)
      || left.record.employeeName.localeCompare(right.record.employeeName)
    )
    .slice(0, 3)
    .map(({ record, risk }) => buildContractRiskItem(record, risk));

const buildSeniorityItems = (
  records: DashboardRecord[],
  asOf: CalendarDate,
  windowEnd: CalendarDate
) => {
  const items: Array<{
    employeeId?: number;
    employeeName: string;
    years: number;
    milestoneDate: string;
    rewardAmount: number;
  }> = [];

  for (const record of records) {
    if (record.status !== "active" || !record.contractStart) continue;
    if (compareCalendarDates(record.contractStart, asOf) > 0) continue;

    for (const milestone of SENIORITY_REWARD_SCHEDULE) {
      const milestoneDate = addCalendarYears(record.contractStart, milestone.years);
      if (
        compareCalendarDates(milestoneDate, asOf) < 0
        || compareCalendarDates(milestoneDate, windowEnd) >= 0
      ) {
        continue;
      }
      items.push({
        employeeId: record.employeeId ?? undefined,
        employeeName: record.employeeName,
        years: milestone.years,
        milestoneDate: formatCalendarDate(milestoneDate),
        rewardAmount: milestone.rewardAmount
      });
    }
  }

  return items.sort((left, right) =>
    left.milestoneDate.localeCompare(right.milestoneDate)
    || left.years - right.years
    || left.employeeName.localeCompare(right.employeeName)
  );
};

const buildSeniorityForecast = (records: DashboardRecord[], asOf: CalendarDate) => {
  const windowEnd = addCalendarMonths(asOf, SENIORITY_FORECAST_MONTHS);
  const items = buildSeniorityItems(records, asOf, windowEnd);
  const rows = SENIORITY_REWARD_SCHEDULE.map((milestone) => {
    const milestoneItems = items.filter((item) => item.years === milestone.years);
    return {
      years: milestone.years,
      rewardAmount: milestone.rewardAmount,
      employees: milestoneItems.length,
      expectedCost: milestoneItems.length * milestone.rewardAmount,
      nextDate: milestoneItems[0]?.milestoneDate ?? null
    };
  });

  return {
    available: records.some((record) => record.status === "active" && record.contractStart),
    basis: "contract-start-only" as const,
    basisNote: "Forecast uses Contract Start Date only. Previous NOC service, excluded periods, service-supplement fields, Stop_takrim, and Percent_takrim are not applied. Expected cost is the gross scheduled amount, not an approved payroll liability.",
    windowMonths: SENIORITY_FORECAST_MONTHS,
    currency: "LYD",
    employeesDue: new Set(items.map((item) => item.employeeId ?? `${item.employeeName}:${item.milestoneDate}`)).size,
    expectedCost: items.reduce((sum, item) => sum + item.rewardAmount, 0),
    rows,
    items
  };
};

const buildSeniorityMilestones = (records: DashboardRecord[], asOf: CalendarDate) =>
  buildSeniorityItems(records, asOf, addCalendarDays(asOf, 91));

type QualityState = "populated" | "missing" | "invalid";

type QualityFieldDefinition = {
  key: string;
  label: string;
  required: boolean;
  classify: (record: DashboardRecord) => QualityState;
};

const buildDataQuality = (records: DashboardRecord[], asOf: CalendarDate) => {
  const fieldDefinitions: QualityFieldDefinition[] = [
    {
      key: "employeeNumber",
      label: "Employee number",
      required: true,
      classify: (record) => record.quality.employeeNumberPresent ? "populated" : "missing"
    },
    {
      key: "employeeName",
      label: "Employee name",
      required: true,
      classify: (record) => record.quality.employeeNamePresent ? "populated" : "missing"
    },
    {
      key: "gender",
      label: "Gender",
      required: true,
      classify: (record) => !record.quality.genderPresent
        ? "missing"
        : record.gender === "unknown" ? "invalid" : "populated"
    },
    {
      key: "dateOfBirth",
      label: "Date of birth",
      required: true,
      classify: (record) => !record.quality.birthDatePresent
        ? "missing"
        : !record.birthDate || compareCalendarDates(record.birthDate, asOf) > 0 ? "invalid" : "populated"
    },
    {
      key: "department",
      label: "Department",
      required: true,
      classify: (record) => !record.quality.departmentIdPresent
        ? "missing"
        : record.quality.departmentResolved ? "populated" : "invalid"
    },
    {
      key: "workLocation",
      label: "Work location",
      required: true,
      classify: (record) => !record.quality.workLocationIdPresent
        ? "missing"
        : record.quality.workLocationResolved ? "populated" : "invalid"
    },
    {
      key: "job",
      label: "Job",
      required: true,
      classify: (record) => !record.quality.jobIdPresent
        ? "missing"
        : record.quality.jobResolved ? "populated" : "invalid"
    },
    {
      key: "contractStart",
      label: "Contract start date",
      required: true,
      classify: (record) => !record.quality.contractStartPresent
        ? "missing"
        : record.contractStart ? "populated" : "invalid"
    },
    {
      key: "contractEnd",
      label: "Contract end date",
      required: false,
      classify: (record) => !record.quality.contractEndPresent
        ? "missing"
        : !record.contractEnd || hasInvalidContractChronology(record) ? "invalid" : "populated"
    },
    {
      key: "contractType",
      label: "Contract type",
      required: false,
      classify: (record) => !record.quality.contractTypePresent
        ? "missing"
        : record.contractType.value === "unknown" ? "invalid" : "populated"
    },
    {
      key: "nationality",
      label: "Nationality",
      required: false,
      classify: (record) => !record.quality.nationalityPresent
        ? "missing"
        : record.nationality.value === "unknown" ? "invalid" : "populated"
    },
    {
      key: "placeOfBirth",
      label: "Place of birth",
      required: false,
      classify: (record) => !record.quality.placeOfBirthPresent
        ? "missing"
        : record.placeOfBirth.value === "unknown" ? "invalid" : "populated"
    },
    {
      key: "familyBookIssuer",
      label: "Family Book Issuer",
      required: false,
      classify: (record) => !record.quality.familyBookIssuerPresent
        ? "missing"
        : record.familyBookIssuer.value === "unknown" ? "invalid" : "populated"
    },
    {
      key: "grade",
      label: "Employee grade",
      required: false,
      classify: (record) => !record.quality.gradePresent
        ? "missing"
        : record.grade.value === "unknown" ? "invalid" : "populated"
    }
  ];

  const fields = fieldDefinitions.map((definition) => {
    const states = records.map(definition.classify);
    const populated = states.filter((state) => state === "populated").length;
    const invalid = states.filter((state) => state === "invalid").length;
    const missing = states.length - populated - invalid;
    return {
      key: definition.key,
      label: definition.label,
      populated,
      missing,
      invalid,
      total: states.length,
      coveragePercent: states.length > 0 ? roundTwoDecimals((populated / states.length) * 100) : 0,
      required: definition.required
    };
  });

  const requiredDefinitions = fieldDefinitions.filter((definition) => definition.required);
  const expectedValues = records.length * requiredDefinitions.length;
  const populatedValues = fields
    .filter((field) => field.required)
    .reduce((sum, field) => sum + field.populated, 0);
  const severityOrder = { high: 0, medium: 1, low: 2 } as const;
  const issues: Array<{
    key: string;
    label: string;
    description: string;
    count: number;
    severity: keyof typeof severityOrder;
    directoryQuery?: Record<string, string>;
  }> = [];
  const addIssue = (
    key: string,
    label: string,
    description: string,
    count: number,
    severity: keyof typeof severityOrder,
    directoryQuery?: Record<string, string>
  ) => {
    if (count <= 0) return;
    issues.push({ key, label, description, count, severity, directoryQuery });
  };

  const missingCoreFields = records.filter((record) =>
    requiredDefinitions.some((definition) => definition.classify(record) !== "populated")
  ).length;
  const duplicateNumberCounts = new Map<string, number>();
  for (const record of records) {
    if (!record.employeeNumber) continue;
    increment(duplicateNumberCounts, normalizeText(record.employeeNumber));
  }
  const duplicateEmployeeRows = Array.from(duplicateNumberCounts.values())
    .filter((count) => count > 1)
    .reduce((sum, count) => sum + count, 0);
  const activeExpiredContracts = records.filter((record) =>
    record.status === "active"
    && record.contractEnd
    && !hasInvalidContractChronology(record)
    && compareCalendarDates(record.contractEnd, asOf) < 0
  ).length;

  addIssue(
    "missing-core-fields",
    "Employees missing core analytics fields",
    "At least one dashboard-critical employee field is missing or invalid.",
    missingCoreFields,
    "high"
  );
  addIssue(
    "missing-department",
    "Department not assigned",
    "Department analytics cannot include employees without a resolved Department_Id.",
    records.filter((record) => !record.quality.departmentResolved).length,
    "high"
  );
  addIssue(
    "missing-work-location",
    "Work location not assigned",
    "Work-location analysis excludes employees without a resolved Location_Id.",
    records.filter((record) => !record.quality.workLocationResolved).length,
    "medium"
  );
  addIssue(
    "missing-job",
    "Job not assigned",
    "Job analysis excludes employees without a resolved Job_Id.",
    records.filter((record) => !record.quality.jobResolved).length,
    "medium"
  );
  addIssue(
    "duplicate-employee-number",
    "Duplicate employee numbers",
    "Employee numbers should uniquely identify classified employee records.",
    duplicateEmployeeRows,
    "high"
  );
  addIssue(
    "invalid-contract-chronology",
    "Contract end precedes contract start",
    "These records are excluded from contract-risk calculations.",
    records.filter(hasInvalidContractChronology).length,
    "high"
  );
  addIssue(
    "active-expired-contract",
    "Active employees with expired contract dates",
    "Employee State is active even though the recorded contract end date is before the dashboard as-of date.",
    activeExpiredContracts,
    "high",
    { status: "active", contractRisk: "expired" }
  );
  addIssue(
    "future-date-of-birth",
    "Future dates of birth",
    "Dates of birth after the dashboard as-of date are invalid.",
    records.filter((record) => record.birthDate && compareCalendarDates(record.birthDate, asOf) > 0).length,
    "high"
  );
  addIssue(
    "family-book-issuer-placeholder",
    "Invalid Family Book Issuer placeholder",
    "A non-empty issuer value does not contain a usable place name and is treated as not recorded.",
    records.filter((record) =>
      record.quality.familyBookIssuerPresent && record.familyBookIssuer.value === "unknown"
    ).length,
    "medium"
  );

  return {
    scorePercent: expectedValues > 0 ? roundOneDecimal((populatedValues / expectedValues) * 100) : 0,
    evaluatedEmployees: records.length,
    populatedValues,
    expectedValues,
    fields,
    issues: issues.sort((left, right) =>
      severityOrder[left.severity] - severityOrder[right.severity]
      || right.count - left.count
      || left.label.localeCompare(right.label)
    )
  };
};

const buildAgeBandOptions = (records: DashboardRecord[], asOf: CalendarDate): FilterOption[] => {
  const options = [
    ...AGE_BANDS.map((band) => ({ value: band.value, label: band.label })),
    { value: "unknown", label: "Unknown" }
  ];
  return options.map((option) => ({
    ...option,
    count: records.filter((record) => ageBandCategory(record, asOf).value === option.value).length
  }));
};

const buildContractRiskOptions = (records: DashboardRecord[], asOf: CalendarDate): FilterOption[] =>
  CONTRACT_RISK_DEFINITIONS.map((definition) => ({
    value: definition.key,
    label: definition.label,
    count: records.filter((record) => classifyContractRisk(record, asOf)?.key === definition.key).length
  }));

const buildSeniorityMilestoneOptions = (records: DashboardRecord[], asOf: CalendarDate): FilterOption[] =>
  SENIORITY_REWARD_SCHEDULE.map((milestone) => ({
    value: String(milestone.years),
    label: `${milestone.years} years`,
    count: records.filter((record) => isSeniorityMilestoneDue(record, milestone.years, asOf)).length
  }));

const buildModuleReadiness = (
  sourceCounts: { experience: number; timeSheet: number; timeSheetCode: number; vacation: number },
  gradePopulated: number,
  employeeTotal: number
) => [
  {
    key: "retirement",
    label: "Retirement forecast",
    status: "policy-required" as const,
    description: "Date of birth is available, but no approved retirement-age policy or policy source is configured.",
    requiredSources: ["Approved retirement policy and effective-date source"],
    metrics: [
      { label: "Retirement age", value: null, unit: "years" },
      { label: "Employees due in 12 months", value: null, unit: "employees" }
    ],
    recordCount: null
  },
  {
    key: "movement",
    label: "Employee movement",
    status: "source-not-connected" as const,
    description: "Current and old position snapshots do not contain effective-dated movement events; Experience has no employee key.",
    requiredSources: ["Employee movement history with employee, from/to assignment, and effective date"],
    metrics: [
      { label: "Movements this month", value: null, unit: "events" },
      { label: "Pending transfers", value: null, unit: "employees" }
    ],
    recordCount: sourceCounts.experience
  },
  {
    key: "attendance",
    label: "Attendance",
    status: sourceCounts.timeSheet > 0 ? "partial" as const : "source-not-connected" as const,
    description: sourceCounts.timeSheet > 0
      ? "Timesheet rows exist, but attendance code semantics and calculation rules are not yet approved."
      : "The TimeSheet fact source contains no records.",
    requiredSources: ["dbo.TimeSheet", "dbo.TimeSheetCode", "Approved attendance-code mapping"],
    metrics: [
      { label: "Absence rate", value: null, unit: "percent" },
      { label: "Absent employees", value: null, unit: "employees" }
    ],
    recordCount: sourceCounts.timeSheet
  },
  {
    key: "leave",
    label: "Leave",
    status: sourceCounts.vacation > 0 ? "partial" as const : "source-not-connected" as const,
    description: sourceCounts.vacation > 0
      ? "Vacation rows exist, but approval-state semantics have not been validated for dashboard reporting."
      : "The Vacation fact source contains no records.",
    requiredSources: ["dbo.Vacation", "dbo.TimeSheetCode", "Approved leave-state mapping"],
    metrics: [
      { label: "Employees on leave", value: null, unit: "employees" },
      { label: "Leave days this month", value: null, unit: "days" }
    ],
    recordCount: sourceCounts.vacation
  },
  {
    key: "recruitment",
    label: "Recruitment",
    status: "source-not-connected" as const,
    description: "No requisition, candidate, application, or hiring-pipeline source is connected.",
    requiredSources: ["Recruitment requisitions", "Candidate applications", "Hiring stage history"],
    metrics: [
      { label: "Open requisitions", value: null, unit: "positions" },
      { label: "Candidates in pipeline", value: null, unit: "candidates" }
    ],
    recordCount: null
  },
  {
    key: "training",
    label: "Training",
    status: "source-not-connected" as const,
    description: "No course, enrollment, completion, or learning-hours source is connected. Contract type is not a training activity source.",
    requiredSources: ["Training catalog", "Employee enrollments", "Completion and learning-hours history"],
    metrics: [
      { label: "Employees trained", value: null, unit: "employees" },
      { label: "Training hours", value: null, unit: "hours" }
    ],
    recordCount: null
  },
  {
    key: "grade",
    label: "Employee grade",
    status: gradePopulated > 0 ? "live" as const : "source-not-connected" as const,
    description: "Employee grade coverage is reported from Degree_Employee. Salary analytics are intentionally excluded.",
    requiredSources: ["dbo.Employee.Degree_Employee"],
    metrics: [
      { label: "Employees with grade", value: gradePopulated, unit: "employees" },
      {
        label: "Grade coverage",
        value: employeeTotal > 0 ? roundTwoDecimals((gradePopulated / employeeTotal) * 100) : 0,
        unit: "percent"
      }
    ],
    recordCount: gradePopulated
  }
];

export const getEmployeeDashboard = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const asOf = readAsOfDate(req.query.asOf);
    const appliedFilters = readAppliedFilters(req);
    const [rows, readinessRows] = await Promise.all([
      sequelize.query(dashboardEmployeeQuery, {
        type: QueryTypes.SELECT,
        raw: true
      }) as Promise<DashboardRow[]>,
      sequelize.query(dashboardReadinessQuery, {
        type: QueryTypes.SELECT,
        raw: true
      }) as Promise<DashboardReadinessRow[]>
    ]);
    const readinessRow = readinessRows[0];
    const sourceCounts = {
      experience: toFiniteNumber(readinessRow?.ExperienceRows) ?? 0,
      timeSheet: toFiniteNumber(readinessRow?.TimeSheetRows) ?? 0,
      timeSheetCode: toFiniteNumber(readinessRow?.TimeSheetCodeRows) ?? 0,
      vacation: toFiniteNumber(readinessRow?.VacationRows) ?? 0
    };
    const allRecords = rows.map(toDashboardRecord);
    const allEmployees = allRecords.filter((record) => record.kind === "employee");
    const filteredRecords = allRecords.filter((record) => matchesFilters(record, appliedFilters, asOf));
    const filteredEmployees = filteredRecords.filter((record) => record.kind === "employee");

    const statusCounts = new Map<EmploymentStatus, number>([
      ["active", 0],
      ["archived", 0],
      ["vacancy", 0],
      ["unknown", 0]
    ]);
    for (const record of allRecords) increment(statusCounts, record.status);

    const genderCounts = new Map<GenderCategory, number>([
      ["male", 0],
      ["female", 0],
      ["unknown", 0]
    ]);
    for (const record of allEmployees) increment(genderCounts, record.gender);

    const departmentPopulated = allEmployees.filter((record) => record.department.value !== "unassigned").length;
    const locationPopulated = allEmployees.filter((record) => record.workLocation.value !== "unassigned").length;
    const genderPopulated = allEmployees.filter((record) => record.gender !== "unknown").length;
    const birthDatePopulated = allEmployees.filter((record) => record.birthDate).length;
    const placeOfBirthPopulated = allEmployees.filter((record) => record.placeOfBirth.value !== "unknown").length;
    const familyBookIssuerPopulated = allEmployees.filter((record) => record.familyBookIssuer.value !== "unknown").length;
    const jobPopulated = allEmployees.filter((record) => record.job.value !== "unassigned").length;
    const gradePopulated = allEmployees.filter((record) => record.grade.value !== "unknown").length;
    const startDatePopulated = allEmployees.filter((record) => record.contractStart).length;
    const contractTypePopulated = allEmployees.filter((record) => record.contractType.value !== "unknown").length;
    const employeeTypePopulated = allEmployees.filter((record) => record.employeeType.value !== "unknown").length;
    const activeEmployees = allEmployees.filter((record) => record.status === "active");
    const activePastContractEnds = activeEmployees.filter((record) =>
      record.contractEnd
      && !hasInvalidContractChronology(record)
      && compareCalendarDates(record.contractEnd, asOf) < 0
    ).length;
    const activeFutureContractEnds = activeEmployees.filter((record) =>
      record.contractEnd
      && !hasInvalidContractChronology(record)
      && compareCalendarDates(record.contractEnd, asOf) >= 0
    ).length;

    const filteredStatusCounts = new Map<EmploymentStatus, number>([
      ["active", 0],
      ["archived", 0],
      ["vacancy", 0],
      ["unknown", 0]
    ]);
    for (const record of filteredRecords) increment(filteredStatusCounts, record.status);

    const filteredGenderCounts = new Map<GenderCategory, number>([
      ["male", 0],
      ["female", 0],
      ["unknown", 0]
    ]);
    for (const record of filteredEmployees) increment(filteredGenderCounts, record.gender);

    const filteredDepartmentOptions = departmentPopulated > 0
      ? countCategoryOptions(filteredEmployees, (record) => record.department).slice(0, 6)
      : [];
    const filteredContractTypeOptions = countCategoryOptions(filteredEmployees, (record) => record.contractType);
    const filteredLocationOptions = countCategoryOptions(filteredEmployees, (record) => record.workLocation);
    const filteredPlaceOfBirthOptions = countCategoryOptions(filteredEmployees, (record) => record.placeOfBirth);
    const filteredFamilyBookIssuerOptions = countCategoryOptions(filteredEmployees, (record) => record.familyBookIssuer);
    const filteredJobOptions = countCategoryOptions(filteredEmployees, (record) => record.job);
    const currentMonthStart = { year: asOf.year, month: asOf.month, day: 1 };
    const newHiresThisMonth = filteredEmployees.filter((record) =>
      record.contractStart
      && compareCalendarDates(record.contractStart, currentMonthStart) >= 0
      && compareCalendarDates(record.contractStart, asOf) <= 0
    ).length;

    const knownGenderCount = (filteredGenderCounts.get("male") ?? 0) + (filteredGenderCounts.get("female") ?? 0);
    const femaleCount = filteredGenderCounts.get("female") ?? 0;
    const nationalitiesRepresented = new Set(
      filteredEmployees
        .map((record) => record.nationalityKey)
        .filter((value): value is string => Boolean(value))
    ).size;
    const dataQuality = buildDataQuality(filteredEmployees, asOf);
    const contractRisk = buildContractRisk(filteredEmployees, asOf);
    const allContractRisk = buildContractRisk(allEmployees, asOf);
    const seniorityForecast = buildSeniorityForecast(filteredEmployees, asOf);
    const contractsExpiring90Days = countContractsExpiring90Days(filteredEmployees, asOf);
    const moduleReadiness = buildModuleReadiness(sourceCounts, gradePopulated, allEmployees.length);
    const generatedAt = new Date().toISOString();

    const unavailable: Array<{ key: string; reason: string }> = [
      {
        key: "trueHeadcountTrend",
        reason: "No employee status history or authoritative separation event source is available. Contract starts are returned instead."
      },
      {
        key: "turnoverRate",
        reason: "Turnover requires authoritative separation events and period opening/closing headcount."
      },
      {
        key: "employeesOnLeave",
        reason: sourceCounts.vacation > 0
          ? "Vacation records exist, but leave-state semantics are not yet validated for dashboard reporting."
          : "The Vacation source currently contains no records and employee State does not encode leave."
      },
      {
        key: "employeeTypes",
        reason: "Type_Employee is sparsely populated and does not represent Staff, Supervisor, Manager, or Executive levels."
      },
      {
        key: "hiringPipeline",
        reason: "No candidate or recruitment pipeline source is available."
      },
      {
        key: "attendance",
        reason: sourceCounts.timeSheet > 0
          ? "Timesheet records exist, but attendance-code semantics are not yet validated for dashboard reporting."
          : "The TimeSheet source currently contains no records."
      },
      {
        key: "femaleManagement",
        reason: "No validated management-level classification is available."
      },
      {
        key: "retirementForecast",
        reason: "No approved retirement-age policy or policy source is configured."
      },
      {
        key: "employeeMovement",
        reason: "No effective-dated employee movement history with an employee key is available."
      },
      {
        key: "training",
        reason: "No course, enrollment, completion, or learning-hours source is connected."
      },
      {
        key: "separationsThisMonth",
        reason: "No authoritative separation event source is available."
      }
    ];

    if (departmentPopulated === 0) {
      unavailable.push({
        key: "departments",
        reason: "Department_Id is not populated on employee records."
      });
    }

    return res.status(200).json({
      success: true,
      message: "Employee dashboard loaded successfully",
      data: {
        asOf: formatCalendarDate(asOf),
        generatedAt,
        coverage: {
          source: "dbo.Employee",
          sourceMode: "live-current-snapshot",
          sourceTimeZone: DASHBOARD_TIME_ZONE,
          trueHeadcountHistory: false,
          department: departmentPopulated > 0,
          employeeType: false,
          placeOfBirth: placeOfBirthPopulated > 0,
          familyBookIssuer: familyBookIssuerPopulated > 0,
          job: jobPopulated > 0,
          grade: gradePopulated > 0,
          turnover: false,
          leave: false,
          attendance: false,
          hiring: false,
          contractExpiry: allContractRisk.available,
          sourceRows: allRecords.length,
          experienceRows: sourceCounts.experience,
          timeSheetRows: sourceCounts.timeSheet,
          timeSheetCodeRows: sourceCounts.timeSheetCode,
          vacationRows: sourceCounts.vacation,
          employeeRecords: allEmployees.length,
          vacancyRecords: allRecords.filter((record) => record.kind === "vacancy").length,
          unclassifiedRecords: allRecords.filter((record) => record.kind === "unknown").length,
          appliedFilters,
          fields: {
            gender: { available: genderPopulated > 0, populated: genderPopulated, total: allEmployees.length },
            dateOfBirth: { available: birthDatePopulated > 0, populated: birthDatePopulated, total: allEmployees.length },
            placeOfBirth: { available: placeOfBirthPopulated > 0, populated: placeOfBirthPopulated, total: allEmployees.length },
            familyBookIssuer: { available: familyBookIssuerPopulated > 0, populated: familyBookIssuerPopulated, total: allEmployees.length },
            job: { available: jobPopulated > 0, populated: jobPopulated, total: allEmployees.length },
            grade: { available: gradePopulated > 0, populated: gradePopulated, total: allEmployees.length },
            department: {
              available: departmentPopulated > 0,
              populated: departmentPopulated,
              total: allEmployees.length,
              reason: departmentPopulated > 0 ? null : "Department_Id is not populated on employee records."
            },
            workLocation: { available: locationPopulated > 0, populated: locationPopulated, total: allEmployees.length },
            contractType: { available: contractTypePopulated > 0, populated: contractTypePopulated, total: allEmployees.length },
            employeeType: {
              available: false,
              populated: employeeTypePopulated,
              total: allEmployees.length,
              reason: "The populated values do not provide a reliable organizational employee-level classification."
            },
            contractStart: { available: startDatePopulated > 0, populated: startDatePopulated, total: allEmployees.length }
          },
          contractExpirations: {
            available: allContractRisk.available,
            quality: "unverified",
            activeFutureDates: activeFutureContractEnds,
            activePastDates: activePastContractEnds,
            warning: allContractRisk.warning
          },
          seniority: {
            available: startDatePopulated > 0,
            note: seniorityForecast.basisNote
          }
        },
        availableFilters: {
          statuses: [
            { value: "active", label: "Active", count: statusCounts.get("active") ?? 0 },
            { value: "archived", label: "Archived", count: statusCounts.get("archived") ?? 0 },
            { value: "vacancy", label: "Vacancy", count: statusCounts.get("vacancy") ?? 0 },
            { value: "unknown", label: "Unknown", count: statusCounts.get("unknown") ?? 0 }
          ],
          departments: departmentPopulated > 0
            ? countCategoryOptions(allEmployees, (record) => record.department)
            : [],
          workLocations: countCategoryOptions(allEmployees, (record) => record.workLocation),
          genders: (["male", "female", "unknown"] as const).map((gender) => ({
            value: gender,
            label: genderLabel(gender),
            count: genderCounts.get(gender) ?? 0
          })),
          contractTypes: countCategoryOptions(allEmployees, (record) => record.contractType),
          employeeTypes: [] as FilterOption[],
          jobs: countCategoryOptions(allEmployees, (record) => record.job),
          nationalities: countCategoryOptions(allEmployees, (record) => record.nationality),
          ageBands: buildAgeBandOptions(allEmployees, asOf),
          contractRisks: buildContractRiskOptions(allEmployees, asOf),
          seniorityMilestones: buildSeniorityMilestoneOptions(allEmployees, asOf)
        },
        kpis: {
          totalEmployees: filteredEmployees.length,
          activeEmployees: filteredEmployees.filter((record) => record.status === "active").length,
          archivedEmployees: filteredEmployees.filter((record) => record.status === "archived").length,
          vacancies: filteredRecords.filter((record) => record.kind === "vacancy").length,
          turnoverRate: null,
          averageAgeYears: averageYears(filteredEmployees, (record) => record.birthDate, asOf),
          averageTenureYears: averageYears(filteredEmployees, (record) => record.contractStart, asOf),
          newHiresThisMonth,
          employeesOnLeave: null,
          dataCompletenessPercent: dataQuality.scorePercent,
          contractsExpiring90Days,
          retirementRiskNext12Months: null,
          absenceRate: null,
          separationsThisMonth: null
        },
        series: {
          contractStartsLast12Months: buildContractStartTrend(filteredEmployees, asOf),
          employmentStatus: [
            { key: "active", label: "Active", value: filteredStatusCounts.get("active") ?? 0 },
            { key: "archived", label: "Archived", value: filteredStatusCounts.get("archived") ?? 0 },
            { key: "vacancy", label: "Vacancy", value: filteredStatusCounts.get("vacancy") ?? 0 },
            { key: "unknown", label: "Unknown", value: filteredStatusCounts.get("unknown") ?? 0 }
          ],
          gender: (["male", "female", "unknown"] as const).map((gender) => ({
            key: gender,
            label: genderLabel(gender),
            value: filteredGenderCounts.get(gender) ?? 0
          })),
          departments: toCategorySeries(filteredDepartmentOptions),
          departmentGenderComposition: departmentPopulated > 0
            ? buildDepartmentGenderComposition(filteredEmployees)
            : [],
          agePyramid: buildAgePyramid(filteredEmployees, asOf),
          placesOfBirth: toCategorySeries(filteredPlaceOfBirthOptions),
          familyBookIssuers: toCategorySeries(filteredFamilyBookIssuerOptions),
          jobs: toCategorySeries(filteredJobOptions),
          workLocations: toCategorySeries(filteredLocationOptions),
          contractTypes: toCategorySeries(filteredContractTypeOptions),
          employeeTypes: [] as CategorySeriesItem[],
          yearsOfService: buildYearsOfService(filteredEmployees, asOf)
        },
        upcomingContractExpirations: buildUpcomingContractExpirations(filteredEmployees, asOf),
        seniorityNext90Days: buildSeniorityMilestones(filteredEmployees, asOf),
        diversity: {
          femaleRepresentation: knownGenderCount > 0
            ? roundOneDecimal((femaleCount / knownGenderCount) * 100)
            : null,
          femaleManagement: null,
          nationalitiesRepresented
        },
        dataQuality,
        contractRisk,
        seniorityForecast,
        retirementForecast: {
          available: false,
          reason: "No approved retirement-age policy or policy source is configured. Date of birth alone is insufficient for an authoritative forecast.",
          policy: {
            retirementAge: null,
            policySource: null
          },
          horizons: [
            { years: 1 as const, employees: null },
            { years: 3 as const, employees: null },
            { years: 5 as const, employees: null }
          ]
        },
        moduleReadiness,
        privacy: {
          audience: "Authorized HR users",
          smallGroupThreshold: PRIVACY_SMALL_GROUP_THRESHOLD,
          demographicDrilldownSuppressed: false
        },
        unavailable
      }
    });
  } catch (error) {
    return next(error);
  }
};
