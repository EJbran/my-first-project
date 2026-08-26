export type HrDashboardFilterValue = string;

export interface HrDashboardFilters {
  status: HrDashboardFilterValue;
  department: HrDashboardFilterValue;
  workLocation: HrDashboardFilterValue;
  gender: HrDashboardFilterValue;
  contractType: HrDashboardFilterValue;
  employeeType: HrDashboardFilterValue;
  job: HrDashboardFilterValue;
  nationality: HrDashboardFilterValue;
  ageBand: HrDashboardFilterValue;
  contractRisk: HrDashboardFilterValue;
  seniorityMilestone: HrDashboardFilterValue;
}

export interface HrDashboardFilterOption {
  value: string;
  label: string;
  count: number;
}

export interface HrDashboardMetric {
  value: number | null;
  delta?: number | null;
  deltaUnit?: "percent" | "percentage-point" | "number";
}

export interface HrDashboardCategoryValue {
  key?: string;
  label: string;
  value: number;
}

export interface HrDashboardTrendPoint extends HrDashboardCategoryValue {
  month?: string;
}

export interface HrDashboardAgeRow {
  label: string;
  male: number;
  female: number;
  unknown: number;
}

export interface HrDashboardDepartmentGenderRow extends HrDashboardAgeRow {
  total: number;
}

export interface HrDashboardSeniorityItem {
  employeeId?: string | number;
  employeeName?: string;
  years: number;
  milestoneDate: string;
  rewardAmount?: number;
}

export interface HrDashboardContractExpiration {
  employeeId?: string | number;
  employeeName: string;
  jobName: string;
  endDate: string;
  daysRemaining: number;
  bucket?: string;
}

export interface HrDashboardUnavailableMetric {
  key: string;
  reason: string;
}

export type HrDashboardSeverity = "high" | "medium" | "low";
export type HrDashboardModuleStatus = "live" | "partial" | "source-not-connected" | "policy-required";

export interface HrDashboardFieldCoverage {
  key: string;
  label: string;
  populated: number;
  missing: number;
  invalid: number;
  total: number;
  coveragePercent: number;
  required: boolean;
}

export interface HrDashboardDataQualityIssue {
  key: string;
  label: string;
  description: string;
  count: number;
  severity: HrDashboardSeverity;
  directoryQuery?: Record<string, string>;
}

export interface HrDashboardDataQuality {
  scorePercent: number;
  evaluatedEmployees: number;
  populatedValues: number;
  expectedValues: number;
  fields: HrDashboardFieldCoverage[];
  issues: HrDashboardDataQualityIssue[];
}

export interface HrDashboardContractRiskBucket extends HrDashboardCategoryValue {
  key: string;
  fromDays?: number | null;
  toDays?: number | null;
}

export interface HrDashboardContractRisk {
  available: boolean;
  quality: "verified" | "unverified" | "partial";
  warning?: string | null;
  buckets: HrDashboardContractRiskBucket[];
  items: HrDashboardContractExpiration[];
}

export interface HrDashboardSeniorityForecastRow {
  years: number;
  rewardAmount: number;
  employees: number;
  expectedCost: number;
  nextDate: string | null;
}

export interface HrDashboardSeniorityForecast {
  available: boolean;
  basis: "contract-start-only" | "recognized-noc-service";
  basisNote: string;
  windowMonths: number;
  currency: string;
  employeesDue: number;
  expectedCost: number;
  rows: HrDashboardSeniorityForecastRow[];
  items: HrDashboardSeniorityItem[];
}

export interface HrDashboardRetirementForecast {
  available: boolean;
  reason: string | null;
  policy: {
    retirementAge: number | null;
    policySource: string | null;
  };
  horizons: Array<{ years: 1 | 3 | 5; employees: number | null }>;
}

export interface HrDashboardReadinessMetric {
  label: string;
  value: number | null;
  unit?: string;
}

export interface HrDashboardModuleReadiness {
  key: string;
  label: string;
  status: HrDashboardModuleStatus;
  description: string;
  requiredSources: string[];
  metrics: HrDashboardReadinessMetric[];
  recordCount?: number | null;
}

export interface HrDashboardPrivacy {
  audience: string;
  smallGroupThreshold: number;
  demographicDrilldownSuppressed: boolean;
}

export interface HrDashboardData {
  asOf: string;
  generatedAt?: string;
  coverage: {
    trueHeadcountHistory?: boolean;
    department?: boolean;
    employeeType?: boolean;
    placeOfBirth?: boolean;
    familyBookIssuer?: boolean;
    job?: boolean;
    turnover?: boolean;
    leave?: boolean;
    attendance?: boolean;
    hiring?: boolean;
    contractExpiry?: boolean;
    [key: string]: boolean | number | string | undefined;
  };
  availableFilters: {
    statuses: HrDashboardFilterOption[];
    workLocations: HrDashboardFilterOption[];
    genders: HrDashboardFilterOption[];
    contractTypes: HrDashboardFilterOption[];
    departments?: HrDashboardFilterOption[];
    employeeTypes?: HrDashboardFilterOption[];
    jobs?: HrDashboardFilterOption[];
    nationalities?: HrDashboardFilterOption[];
    ageBands?: HrDashboardFilterOption[];
    contractRisks?: HrDashboardFilterOption[];
    seniorityMilestones?: HrDashboardFilterOption[];
  };
  kpis: {
    totalEmployees: HrDashboardMetric | number;
    activeEmployees: HrDashboardMetric | number;
    archivedEmployees?: HrDashboardMetric | number;
    vacancies: HrDashboardMetric | number;
    turnoverRate: HrDashboardMetric | number | null;
    averageAgeYears: HrDashboardMetric | number | null;
    averageTenureYears: HrDashboardMetric | number | null;
    newHiresThisMonth: HrDashboardMetric | number;
    employeesOnLeave: HrDashboardMetric | number | null;
    dataCompletenessPercent?: HrDashboardMetric | number | null;
    contractsExpiring90Days?: HrDashboardMetric | number | null;
    retirementRiskNext12Months?: HrDashboardMetric | number | null;
    absenceRate?: HrDashboardMetric | number | null;
    separationsThisMonth?: HrDashboardMetric | number | null;
  };
  series: {
    contractStartsLast12Months: HrDashboardTrendPoint[];
    employmentStatus: HrDashboardCategoryValue[];
    gender: HrDashboardCategoryValue[];
    departments?: HrDashboardCategoryValue[];
    departmentGenderComposition?: HrDashboardDepartmentGenderRow[];
    agePyramid: HrDashboardAgeRow[];
    placesOfBirth?: HrDashboardCategoryValue[];
    familyBookIssuers?: HrDashboardCategoryValue[];
    jobs?: HrDashboardCategoryValue[];
    workLocations: HrDashboardCategoryValue[];
    contractTypes: HrDashboardCategoryValue[];
    employeeTypes?: HrDashboardCategoryValue[];
    yearsOfService: HrDashboardCategoryValue[];
  };
  seniorityNext90Days: HrDashboardSeniorityItem[];
  upcomingContractExpirations?: HrDashboardContractExpiration[];
  diversity?: {
    femaleRepresentation: number | null;
    femaleManagement: number | null;
    nationalitiesRepresented: number;
  };
  dataQuality?: HrDashboardDataQuality;
  contractRisk?: HrDashboardContractRisk;
  seniorityForecast?: HrDashboardSeniorityForecast;
  retirementForecast?: HrDashboardRetirementForecast;
  moduleReadiness?: HrDashboardModuleReadiness[];
  privacy?: HrDashboardPrivacy;
  unavailable: HrDashboardUnavailableMetric[];
}
