import { QueryTypes } from "sequelize";

const { sequelize } = require("../../config/database");

type RequestLike = {
  query?: Record<string, unknown>;
  user?: {
    id?: number;
    username?: string;
    email?: string;
  };
};

type ResponseLike = {
  status: (statusCode: number) => ResponseLike;
  json: (payload: Record<string, unknown>) => unknown;
};

type NextLike = (error?: unknown) => void;

type SeniorityAwardDatabaseRow = {
  ID_Employee: unknown;
  Ref_Employee: unknown;
  EmployeeName: unknown;
  EmployeeName_En: unknown;
  Finance_Num: unknown;
  Phone: unknown;
  Contract_Type: unknown;
  Type_Employee: unknown;
  Degree_Employee: unknown;
  Start_of_Contract: unknown;
  ContractEnd: unknown;
  Stop_takrim: unknown;
  Notes_Stop_takrim: unknown;
  Percent_takrim: unknown;
  Date_urgent_takrim: unknown;
  YearSuppliment_YEAR: unknown;
  YearSuppliment_MONTH: unknown;
  Year_suppliment_Day: unknown;
  DateYear_Suppliment: unknown;
  DepartmentId: unknown;
  DepartmentName_English: unknown;
  DepartmentName_Arabic: unknown;
  LocationId: unknown;
  LocationName_en: unknown;
  LocationName_ar: unknown;
  JobId: unknown;
  Job_Name: unknown;
  ServiceYears: unknown;
  AnnualNetReward: unknown;
  ScheduledAmount: unknown;
  EligibilityDate: unknown;
};

type ReportLineStatus = "eligible" | "held" | "review-required";

type SeniorityAwardReportLine = {
  key: string;
  employeeId: number;
  employeeNumber: string;
  employeeName: string;
  employeeNameEnglish: string;
  employeeNameArabic: string;
  financeNumber: string;
  phone: string;
  departmentId: number | null;
  departmentName: string;
  jobId: number | null;
  jobName: string;
  locationId: number | null;
  workLocation: string;
  contractType: string;
  employeeType: string;
  grade: string;
  contractStartDate: string;
  contractEndDate: string | null;
  milestoneYears: number;
  awardLabel: string;
  eligibilityDate: string;
  annualNetReward: number;
  scheduledAmount: number;
  payableAmount: number;
  status: ReportLineStatus;
  holdReason: string | null;
  seniorityPercentage: number | null;
  urgentAwardDate: string | null;
  serviceSupplement: {
    years: number;
    months: number;
    days: number;
    approvalDate: string | null;
    isRecorded: boolean;
  };
  validationWarnings: string[];
};

const REPORT_TIME_ZONE = "Africa/Tripoli";
const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 100;

const SENIORITY_REWARD_SCHEDULE = [
  { years: 5, annualNetReward: 300, scheduledAmount: 1_500 },
  { years: 10, annualNetReward: 350, scheduledAmount: 3_500 },
  { years: 15, annualNetReward: 400, scheduledAmount: 6_000 },
  { years: 20, annualNetReward: 450, scheduledAmount: 9_000 },
  { years: 25, annualNetReward: 500, scheduledAmount: 12_500 },
  { years: 30, annualNetReward: 550, scheduledAmount: 16_500 },
  { years: 35, annualNetReward: 600, scheduledAmount: 21_000 },
  { years: 40, annualNetReward: 650, scheduledAmount: 26_000 },
  { years: 45, annualNetReward: 700, scheduledAmount: 31_500 },
  { years: 50, annualNetReward: 750, scheduledAmount: 37_500 }
] as const;

const seniorityAwardReportQuery = `
  WITH RewardSchedule AS (
    SELECT *
    FROM (VALUES
      (5,  CAST(300.000 AS decimal(18,3)), CAST(1500.000 AS decimal(18,3))),
      (10, CAST(350.000 AS decimal(18,3)), CAST(3500.000 AS decimal(18,3))),
      (15, CAST(400.000 AS decimal(18,3)), CAST(6000.000 AS decimal(18,3))),
      (20, CAST(450.000 AS decimal(18,3)), CAST(9000.000 AS decimal(18,3))),
      (25, CAST(500.000 AS decimal(18,3)), CAST(12500.000 AS decimal(18,3))),
      (30, CAST(550.000 AS decimal(18,3)), CAST(16500.000 AS decimal(18,3))),
      (35, CAST(600.000 AS decimal(18,3)), CAST(21000.000 AS decimal(18,3))),
      (40, CAST(650.000 AS decimal(18,3)), CAST(26000.000 AS decimal(18,3))),
      (45, CAST(700.000 AS decimal(18,3)), CAST(31500.000 AS decimal(18,3))),
      (50, CAST(750.000 AS decimal(18,3)), CAST(37500.000 AS decimal(18,3)))
    ) configured([ServiceYears], [AnnualNetReward], [ScheduledAmount])
  ),
  Eligible AS (
    SELECT
      employee.[ID_Employee],
      employee.[Ref_Employee],
      employee.[EmployeeName],
      employee.[EmployeeName_En],
      employee.[Finance_Num],
      employee.[Phone],
      employee.[Contract_Type],
      employee.[Type_Employee],
      employee.[Degree_Employee],
      TRY_CONVERT(date, employee.[Start_of_Contract]) AS [Start_of_Contract],
      TRY_CONVERT(date, employee.[End_of_contrat]) AS [ContractEnd],
      employee.[Stop_takrim],
      employee.[Notes_Stop_takrim],
      employee.[Percent_takrim],
      employee.[Date_urgent_takrim],
      employee.[YearSuppliment_YEAR],
      employee.[YearSuppliment_MONTH],
      employee.[Year_suppliment_Day],
      employee.[DateYear_Suppliment],
      department.[Id] AS [DepartmentId],
      department.[DepartmentName_English],
      department.[DepartmentName_Arabic],
      location.[ID_Location] AS [LocationId],
      location.[LocationName_en],
      location.[LocationName_ar],
      currentPosition.[Job_ID] AS [JobId],
      COALESCE(
        currentJob.[Job_Name_EN],
        currentJob.[Job_Name_AR]
      ) AS [Job_Name],
      schedule.[ServiceYears],
      schedule.[AnnualNetReward],
      schedule.[ScheduledAmount],
      DATEADD(
        YEAR,
        schedule.[ServiceYears],
        TRY_CONVERT(date, employee.[Start_of_Contract])
      ) AS [EligibilityDate]
    FROM [dbo].[employee] AS employee
    CROSS JOIN RewardSchedule AS schedule
    LEFT JOIN [dbo].[Departments] AS department
      ON employee.[Department_Id] = department.[Id]
    LEFT JOIN [dbo].[Location] AS location
      ON employee.[Location_Id] = location.[ID_Location]
    LEFT JOIN [dbo].[Position] AS currentPosition
      ON currentPosition.[EmployeeId] = employee.[ID_Employee]
    LEFT JOIN [dbo].[jobs] AS currentJob
      ON currentJob.[Job_ID] = currentPosition.[Job_ID]
    WHERE
      NULLIF(LTRIM(RTRIM(CONVERT(nvarchar(50), employee.[Ref_Employee]))), N'') IS NOT NULL
      AND (
        TRY_CONVERT(decimal(38,10), employee.[Ref_Employee]) IS NULL
        OR TRY_CONVERT(decimal(38,10), employee.[Ref_Employee]) <> 0
      )
      AND (
        COALESCE(TRY_CONVERT(int, employee.[State]), 0) = 1
        OR LOWER(LTRIM(RTRIM(CONVERT(nvarchar(20), employee.[State])))) = N'true'
      )
      AND TRY_CONVERT(date, employee.[Start_of_Contract]) IS NOT NULL
      AND TRY_CONVERT(date, employee.[Start_of_Contract]) >=
        DATEADD(YEAR, -schedule.[ServiceYears], CONVERT(date, :monthStart, 23))
      AND TRY_CONVERT(date, employee.[Start_of_Contract]) <
        DATEADD(YEAR, -schedule.[ServiceYears], CONVERT(date, :nextMonthStart, 23))
  )
  SELECT *
  FROM Eligible
  WHERE [EligibilityDate] >= CONVERT(date, :monthStart, 23)
    AND [EligibilityDate] < CONVERT(date, :nextMonthStart, 23)
    AND ([ContractEnd] IS NULL OR [ContractEnd] >= [EligibilityDate])
  ORDER BY [EligibilityDate], [ServiceYears], [EmployeeName_En], [EmployeeName], [ID_Employee];
`;

const toText = (value: unknown): string =>
  value === null || value === undefined ? "" : String(value).trim();

const toFiniteNumber = (value: unknown): number | null => {
  if (toText(value) === "") return null;
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : null;
};

const toNonNegativeInteger = (value: unknown): number => {
  const numericValue = toFiniteNumber(value);
  return numericValue === null ? 0 : Math.max(0, Math.trunc(numericValue));
};

const toBoolean = (value: unknown): boolean => {
  if (value === true || value === 1) return true;
  const normalized = toText(value).toLocaleLowerCase("en-US");
  return normalized === "1" || normalized === "true";
};

const toDateOnly = (value: unknown): string | null => {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }

  const match = /^(\d{4}-\d{2}-\d{2})/.exec(toText(value));
  return match?.[1] ?? null;
};

const normalizeSearchText = (value: unknown): string =>
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

const readQueryValue = (value: unknown): string => {
  const candidate = Array.isArray(value) ? value[0] : value;
  return toText(candidate);
};

const currentReportMonth = (): string => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: REPORT_TIME_ZONE,
    year: "numeric",
    month: "2-digit"
  }).formatToParts(new Date());
  const values = new Map(parts.map((part) => [part.type, part.value]));
  return `${values.get("year")}-${values.get("month")}`;
};

const parseReportMonth = (value: unknown) => {
  const monthKey = readQueryValue(value) || currentReportMonth();
  const match = /^(\d{4})-(\d{2})$/.exec(monthKey);
  const year = Number(match?.[1]);
  const month = Number(match?.[2]);

  if (!match || year < 1900 || year > 9999 || month < 1 || month > 12) {
    return null;
  }

  const nextYear = month === 12 ? year + 1 : year;
  const nextMonth = month === 12 ? 1 : month + 1;
  const monthStart = `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-01`;
  const nextMonthStart = `${String(nextYear).padStart(4, "0")}-${String(nextMonth).padStart(2, "0")}-01`;
  const dueDate = new Date(Date.UTC(nextYear, nextMonth - 1, 0)).toISOString().slice(0, 10);
  const periodLabel = new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC"
  }).format(new Date(Date.UTC(year, month - 1, 1)));

  return {
    year,
    month,
    monthKey,
    monthStart,
    nextMonthStart,
    dueDate,
    periodLabel
  };
};

const parsePositiveInteger = (value: unknown, fallback: number, maximum?: number): number => {
  const parsed = Number(readQueryValue(value));
  if (!Number.isSafeInteger(parsed) || parsed <= 0) return fallback;
  return maximum ? Math.min(parsed, maximum) : parsed;
};

const toReportLine = (row: SeniorityAwardDatabaseRow): SeniorityAwardReportLine => {
  const employeeId = toFiniteNumber(row.ID_Employee) ?? 0;
  const employeeNumber = toText(row.Ref_Employee);
  const employeeNameEnglish = toText(row.EmployeeName_En);
  const employeeNameArabic = toText(row.EmployeeName);
  const employeeName = employeeNameEnglish || employeeNameArabic || `Employee ${employeeNumber || employeeId}`;
  const financeNumber = toText(row.Finance_Num);
  const jobName = toText(row.Job_Name);
  const departmentName = toText(row.DepartmentName_English) || toText(row.DepartmentName_Arabic);
  const workLocation = toText(row.LocationName_en) || toText(row.LocationName_ar);
  const contractStartDate = toDateOnly(row.Start_of_Contract) ?? "";
  const eligibilityDate = toDateOnly(row.EligibilityDate) ?? "";
  const milestoneYears = toFiniteNumber(row.ServiceYears) ?? 0;
  const annualNetReward = toFiniteNumber(row.AnnualNetReward) ?? 0;
  const scheduledAmount = toFiniteNumber(row.ScheduledAmount) ?? 0;
  const isHeld = toBoolean(row.Stop_takrim);
  const seniorityPercentage = toFiniteNumber(row.Percent_takrim);
  const supplementYears = toNonNegativeInteger(row.YearSuppliment_YEAR);
  const supplementMonths = toNonNegativeInteger(row.YearSuppliment_MONTH);
  const supplementDays = toNonNegativeInteger(row.Year_suppliment_Day);
  const supplementApprovalDate = toDateOnly(row.DateYear_Suppliment);
  const hasUnappliedServiceAdjustment = supplementYears > 0
    || supplementMonths > 0
    || supplementDays > 0
    || Boolean(supplementApprovalDate);
  const validationWarnings: string[] = [];

  if (!financeNumber) validationWarnings.push("Missing finance number");
  if (!employeeNameEnglish && !employeeNameArabic) validationWarnings.push("Missing employee name");
  if (!jobName) validationWarnings.push("Missing current job");
  if (!departmentName) validationWarnings.push("Missing department");
  if (!workLocation) validationWarnings.push("Missing work location");
  if (hasUnappliedServiceAdjustment) validationWarnings.push("Previous service adjustment requires HR review");
  if (seniorityPercentage !== null && seniorityPercentage > 0 && seniorityPercentage !== 100) {
    validationWarnings.push("Seniority percentage is recorded but not applied by the current policy");
  }
  const urgentAwardDate = toDateOnly(row.Date_urgent_takrim);
  if (urgentAwardDate) {
    validationWarnings.push("Urgent award date is recorded and requires HR verification");
  }

  const status: ReportLineStatus = isHeld
    ? "held"
    : validationWarnings.length > 0
      ? "review-required"
      : "eligible";

  return {
    key: `${employeeId}:${milestoneYears}`,
    employeeId,
    employeeNumber,
    employeeName,
    employeeNameEnglish,
    employeeNameArabic,
    financeNumber,
    phone: toText(row.Phone),
    departmentId: toFiniteNumber(row.DepartmentId),
    departmentName: departmentName || "Not recorded",
    jobId: toFiniteNumber(row.JobId),
    jobName: jobName || "Not recorded",
    locationId: toFiniteNumber(row.LocationId),
    workLocation: workLocation || "Not recorded",
    contractType: toText(row.Contract_Type) || "Not recorded",
    employeeType: toText(row.Type_Employee) || "Not recorded",
    grade: toText(row.Degree_Employee) || "Not recorded",
    contractStartDate,
    contractEndDate: toDateOnly(row.ContractEnd),
    milestoneYears,
    awardLabel: `${milestoneYears}-Year Service Award`,
    eligibilityDate,
    annualNetReward,
    scheduledAmount,
    payableAmount: status === "eligible" ? scheduledAmount : 0,
    status,
    holdReason: isHeld ? toText(row.Notes_Stop_takrim) || "Award is on hold" : null,
    seniorityPercentage,
    urgentAwardDate,
    serviceSupplement: {
      years: supplementYears,
      months: supplementMonths,
      days: supplementDays,
      approvalDate: supplementApprovalDate,
      isRecorded: hasUnappliedServiceAdjustment
    },
    validationWarnings
  };
};

const matchesReportFilters = (
  line: SeniorityAwardReportLine,
  search: string,
  milestone: number | null,
  status: ReportLineStatus | null
): boolean => {
  const normalizedSearch = normalizeSearchText(search);
  const matchesSearch = !normalizedSearch || [
    line.employeeNumber,
    line.employeeName,
    line.employeeNameEnglish,
    line.employeeNameArabic,
    line.financeNumber,
    line.departmentName,
    line.jobName,
    line.workLocation
  ].some((value) => normalizeSearchText(value).includes(normalizedSearch));

  return matchesSearch
    && (milestone === null || line.milestoneYears === milestone)
    && (status === null || line.status === status);
};

const buildReportSummary = (lines: SeniorityAwardReportLine[]) => {
  const milestoneBreakdown = SENIORITY_REWARD_SCHEDULE.map((milestone) => {
    const milestoneLines = lines.filter((line) => line.milestoneYears === milestone.years);
    return {
      milestoneYears: milestone.years,
      awardLabel: `${milestone.years}-Year Service Award`,
      annualNetReward: milestone.annualNetReward,
      scheduledAmountPerAward: milestone.scheduledAmount,
      awardsDue: milestoneLines.length,
      payableAwards: milestoneLines.filter((line) => line.status === "eligible").length,
      reviewRequiredAwards: milestoneLines.filter((line) => line.status === "review-required").length,
      heldAwards: milestoneLines.filter((line) => line.status === "held").length,
      scheduledAmount: milestoneLines.reduce((total, line) => total + line.scheduledAmount, 0),
      payableAmount: milestoneLines.reduce((total, line) => total + line.payableAmount, 0),
      reviewAmount: milestoneLines.reduce(
        (total, line) => total + (line.status === "review-required" ? line.scheduledAmount : 0),
        0
      )
    };
  }).filter((milestone) => milestone.awardsDue > 0);

  return {
    employeesDue: new Set(lines.map((line) => line.employeeId)).size,
    awardsDue: lines.length,
    eligibleAwards: lines.filter((line) => line.status === "eligible").length,
    reviewRequiredAwards: lines.filter((line) => line.status === "review-required").length,
    heldAwards: lines.filter((line) => line.status === "held").length,
    scheduledAmount: lines.reduce((total, line) => total + line.scheduledAmount, 0),
    payableAmount: lines.reduce((total, line) => total + line.payableAmount, 0),
    heldAmount: lines.reduce(
      (total, line) => total + (line.status === "held" ? line.scheduledAmount : 0),
      0
    ),
    reviewAmount: lines.reduce(
      (total, line) => total + (line.status === "review-required" ? line.scheduledAmount : 0),
      0
    ),
    rowsWithValidationWarnings: lines.filter((line) => line.validationWarnings.length > 0).length,
    milestoneBreakdown
  };
};

export const getMonthlySeniorityAwardReport = async (
  req: RequestLike,
  res: ResponseLike,
  next: NextLike
) => {
  try {
    const period = parseReportMonth(req.query?.month);
    if (!period) {
      return res.status(400).json({
        success: false,
        message: "Report month must use YYYY-MM format"
      });
    }

    const page = parsePositiveInteger(req.query?.page, 1);
    const pageSize = parsePositiveInteger(req.query?.pageSize, DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);
    const includeAllRows = readQueryValue(req.query?.all).toLocaleLowerCase("en-US") === "true";
    const search = readQueryValue(req.query?.search);
    const requestedMilestone = toFiniteNumber(readQueryValue(req.query?.milestone));
    const milestone = requestedMilestone !== null
      && SENIORITY_REWARD_SCHEDULE.some((candidate) => candidate.years === requestedMilestone)
      ? requestedMilestone
      : null;
    const requestedStatus = readQueryValue(req.query?.status);
    const status = (["eligible", "held", "review-required"] as const).find(
      (candidate) => candidate === requestedStatus
    ) ?? null;

    const rows = await sequelize.query(seniorityAwardReportQuery, {
      replacements: {
        monthStart: period.monthStart,
        nextMonthStart: period.nextMonthStart
      },
      type: QueryTypes.SELECT,
      raw: true
    }) as SeniorityAwardDatabaseRow[];
    const allLines = rows.map(toReportLine);
    const filteredLines = allLines.filter((line) =>
      matchesReportFilters(line, search, milestone, status)
    );
    const totalPages = Math.max(1, Math.ceil(filteredLines.length / pageSize));
    const safePage = Math.min(page, totalPages);
    const offset = (safePage - 1) * pageSize;
    const items = includeAllRows
      ? filteredLines
      : filteredLines.slice(offset, offset + pageSize);
    const generatedAt = new Date().toISOString();

    return res.status(200).json({
      success: true,
      message: "Monthly seniority award report loaded successfully",
      data: {
        reportType: "seniority-awards",
        reportStatus: "draft",
        documentNumber: `HR-SAR-${period.year}-${String(period.month).padStart(2, "0")}`,
        period: period.monthKey,
        periodLabel: period.periodLabel,
        periodStart: period.monthStart,
        periodEnd: period.dueDate,
        dueDate: period.dueDate,
        generatedAt,
        generatedBy: {
          id: req.user?.id ?? null,
          name: req.user?.username ?? req.user?.email ?? "Authenticated HR user",
          email: req.user?.email ?? null
        },
        department: "Human Resources",
        classification: "Internal Use",
        currency: "LYD",
        policy: {
          version: "Configured seniority reward schedule v1",
          calculationBasis: "contract-start-only",
          note: "Eligibility is calculated from Contract Start Date only. Previous NOC service, non-counted periods, service-supplement values, and seniority percentage are shown for review but are not applied automatically."
        },
        workflow: {
          currentStep: "draft",
          steps: ["draft", "review", "submitted", "approved"],
          persistenceAvailable: false,
          note: "This is a live draft. Immutable submission and approval history require the HR report workflow tables."
        },
        summary: buildReportSummary(allLines),
        filters: {
          search,
          milestone,
          status,
          availableMilestones: SENIORITY_REWARD_SCHEDULE.map((item) => item.years),
          availableStatuses: ["eligible", "review-required", "held"]
        },
        items,
        pagination: {
          page: includeAllRows ? 1 : safePage,
          pageSize: includeAllRows ? filteredLines.length : pageSize,
          total: filteredLines.length,
          totalPages: includeAllRows ? 1 : totalPages,
          allRows: includeAllRows
        }
      }
    });
  } catch (error) {
    return next(error);
  }
};
