export type SeniorityAwardLineStatus = "eligible" | "review-required" | "held";

export interface SeniorityAwardServiceSupplement {
  years: number;
  months: number;
  days: number;
  approvalDate: string | null;
  isRecorded: boolean;
}

export interface SeniorityAwardReportLine {
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
  status: SeniorityAwardLineStatus;
  holdReason: string | null;
  seniorityPercentage: number | null;
  urgentAwardDate: string | null;
  serviceSupplement: SeniorityAwardServiceSupplement;
  validationWarnings: string[];
}

export interface SeniorityAwardMilestoneSummary {
  milestoneYears: number;
  awardLabel: string;
  annualNetReward: number;
  scheduledAmountPerAward: number;
  awardsDue: number;
  payableAwards: number;
  reviewRequiredAwards: number;
  heldAwards: number;
  scheduledAmount: number;
  payableAmount: number;
  reviewAmount: number;
}

export interface SeniorityAwardReportSummary {
  employeesDue: number;
  awardsDue: number;
  eligibleAwards: number;
  reviewRequiredAwards: number;
  heldAwards: number;
  scheduledAmount: number;
  payableAmount: number;
  heldAmount: number;
  reviewAmount: number;
  rowsWithValidationWarnings: number;
  milestoneBreakdown: SeniorityAwardMilestoneSummary[];
}

export interface MonthlySeniorityAwardReport {
  reportType: "seniority-awards";
  reportStatus: "draft";
  documentNumber: string;
  period: string;
  periodLabel: string;
  periodStart: string;
  periodEnd: string;
  dueDate: string;
  generatedAt: string;
  generatedBy: {
    id: number | null;
    name: string;
    email: string | null;
  };
  department: string;
  classification: string;
  currency: "LYD";
  policy: {
    version: string;
    calculationBasis: "contract-start-only";
    note: string;
  };
  workflow: {
    currentStep: "draft";
    steps: Array<"draft" | "review" | "submitted" | "approved">;
    persistenceAvailable: boolean;
    note: string;
  };
  summary: SeniorityAwardReportSummary;
  filters: {
    search: string;
    milestone: number | null;
    status: SeniorityAwardLineStatus | null;
    availableMilestones: number[];
    availableStatuses: SeniorityAwardLineStatus[];
  };
  items: SeniorityAwardReportLine[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    allRows: boolean;
  };
}

export interface MonthlySeniorityAwardReportRequest {
  month: string;
  page?: number;
  pageSize?: number;
  search?: string;
  milestone?: number | null;
  status?: SeniorityAwardLineStatus | null;
  all?: boolean;
}
