import type { EmployeeDatabaseValue } from "./employee.types";
import type { ApiErrorResponse, ApiPaginatedResponse } from "./common.types";

export interface VacationRecord {
  [key: string]: EmployeeDatabaseValue | undefined;
  Id?: EmployeeDatabaseValue;
  Ref_Employee?: EmployeeDatabaseValue;
  ID_Employee?: EmployeeDatabaseValue;
  Id_CodeTimeSheet?: EmployeeDatabaseValue;
  ID_CodeTimeSheet?: EmployeeDatabaseValue;
  VacationDate_Start?: EmployeeDatabaseValue;
  VacationDate_End?: EmployeeDatabaseValue;
  ReturnDate?: EmployeeDatabaseValue;
  Num_VacationDays?: EmployeeDatabaseValue;
  CreatedDate?: EmployeeDatabaseValue;
  RemainingBalance?: EmployeeDatabaseValue;
  State?: EmployeeDatabaseValue;
  Cause?: EmployeeDatabaseValue;
  DeductedLeaveDays?: EmployeeDatabaseValue;
  HolidayDays?: EmployeeDatabaseValue;
  ResolvedTimeSheetCodeId?: EmployeeDatabaseValue;
  ResolvedTimeSheetCode?: EmployeeDatabaseValue;
  ResolvedTimeSheetCodeDescription?: EmployeeDatabaseValue;
  ResolvedTimeSheetCodeNameEnglish?: EmployeeDatabaseValue;
  ResolvedTimeSheetCodeNameArabic?: EmployeeDatabaseValue;
  TimeSheetCode?: EmployeeDatabaseValue;
  TimeSheetCodeDescription?: EmployeeDatabaseValue;
  Code?: EmployeeDatabaseValue;
  Code_Description?: EmployeeDatabaseValue;
}

export interface VacationColumnMetadata {
  key: string;
  label: string;
  dataType: string;
  ordinal?: number;
}

export interface VacationListSuccessResponse extends ApiPaginatedResponse<VacationRecord> {
  columns?: VacationColumnMetadata[];
  resolvedColumns?: VacationColumnMetadata[];
  sources?: {
    vacation: string;
    timeSheetCode: string;
    timeSheetCodeResolution: "available" | "table-unavailable" | "schema-incompatible";
    codeReferenceColumn: string | null;
    codeLookupIdColumn: string | null;
  };
}

export type VacationListResponse = VacationListSuccessResponse | ApiErrorResponse;

export interface VacationListParams {
  page: number;
  pageSize: number;
}
