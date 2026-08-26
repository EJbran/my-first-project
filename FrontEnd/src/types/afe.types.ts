export const AFE_TYPES = [
  "GENERAL",
  "CAPEX",
  "OPEX",
  "WIP",
  "REHABILITATION",
  "IT_PROJECT",
  "MAINTENANCE",
  "DRILLING"
] as const;

export const AFE_STATUSES = [
  "ACTIVE",
  "ON_HOLD",
  "CLOSED",
  "CANCELLED"
] as const;

export const AFE_PROJECT_NATURES = [
  "CAPEX",
  "OPEX",
  "MIXED",
  "WIP"
] as const;

export const AFE_PRIORITIES = [
  "LOW",
  "MEDIUM",
  "HIGH",
  "CRITICAL"
] as const;

export type AfeType = (typeof AFE_TYPES)[number];
export type AfeStatus = (typeof AFE_STATUSES)[number];
export type AfeProjectNature = (typeof AFE_PROJECT_NATURES)[number];
export type AfePriority = (typeof AFE_PRIORITIES)[number];

export interface AFE {
  Id: number;
  SourceLineNo: number | null;
  ImportBatchNo: string | null;
  AFENo: string;
  AFEDescription: string;
  AFEDescriptionArabic: string | null;
  LegacyDescription: string | null;
  LegacyLocationCode: string | null;
  LegacyDepartmentCode: string | null;
  LegacyDepartmentName: string | null;
  EPSAId: number | null;
  DepartmentId: number | null;
  LocationId: number | null;
  AFEType: string;
  AFECategory: string | null;
  ProjectNature: string | null;
  Priority: string | null;
  StartDate: string | null;
  EndDate: string | null;
  PlannedStartDate: string | null;
  PlannedEndDate: string | null;
  CurrencyCode: string;
  EstimatedBudget: number | null;
  ApprovedBudget: number | null;
  CommittedAmount: number;
  ActualAmount: number;
  RemainingBudget: number | null;
  DefaultChartAccountId: number | null;
  IsBudgetControlled: boolean;
  IsCapitalizable: boolean | null;
  RequiresAFEOnTransaction: boolean;
  Status: string;
  IsActive: boolean;
  Notes: string | null;
  CreatedAt?: string;
  UpdatedAt?: string;
  DepartmentName?: string | null;
  DepartmentNameArabic?: string | null;
  LocationName?: string | null;
  LocationNameArabic?: string | null;
  LocationCode?: string | null;
  Department?: {
    Id: number;
    DepartmentName_English: string;
    DepartmentName_Arabic: string;
  } | null;
  Location?: {
    ID_Location: number;
    LocationName_en: string;
    LocationName_ar: string | null;
    LocationCode: string;
  } | null;
}

export interface AFESummary {
  total: number;
  active: number;
  onHold: number;
  closed: number;
  cancelled: number;
}

export interface AFEListResult {
  success: true;
  message: string;
  data: AFE[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
  summary: AFESummary;
}

export type AFEPayload = Partial<
  Omit<AFE, "Id" | "RemainingBudget" | "CreatedAt" | "UpdatedAt">
>;
