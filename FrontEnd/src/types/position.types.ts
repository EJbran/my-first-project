import type { ApiErrorResponse, PaginationMeta } from "./common.types";

export interface PositionRecord {
  PositionId: number;
  Position_Number: number | string | null;
  EmployeeId: number | null;
  Position_Type: number | string | null;
  PositionLevel: number | string | null;
  Position_Degree: number | string | null;
  Position_DateCreation: string | null;
  Status: number | string | null;
  JobId: number | null;
  Job_Name_AR: string | null;
  Job_Name_EN: string | null;
  Job_Family?: string | null;
  LineLevelId?: number | null;
  LineLevelSort?: number | null;
  LineLevelName_EN?: string | null;
  LineLevelName_AR?: string | null;
  EmployeeNumber?: string | null;
  EmployeeName_EN?: string | null;
  EmployeeName_AR?: string | null;
}

export type CurrentPosition = PositionRecord;
export type VacantPosition = PositionRecord;
export type PositionSortBy =
  | "positionId"
  | "positionNumber"
  | "job"
  | "positionType"
  | "positionLevel"
  | "employee"
  | "occupancy"
  | "dataStatus";

export interface PositionListParams {
  page?: number;
  pageSize?: number;
  search?: string;
  jobId?: number;
  occupancy?: "occupied" | "vacant";
  positionType?: string;
  status?: string;
  sortBy?: PositionSortBy;
  sortDirection?: "asc" | "desc";
}

export interface PositionListSummary {
  total: number;
  occupied: number;
  vacant: number;
  missingJob: number;
}

export interface PositionOptions {
  positionTypes: string[];
  positionLevels: string[];
  positionDegrees: string[];
  statuses: string[];
}

export interface CreatePositionPayload {
  positionNumber: string;
  positionType?: string | null;
  positionLevel?: string | null;
  positionDegree?: string | null;
  positionDateCreation?: string | null;
  status?: string | null;
  jobId: number;
}

export type UpdatePositionPayload = CreatePositionPayload;

export interface DeletePositionResult {
  positionId: number;
}

export interface SetEmployeePositionPayload {
  employeeId: number;
  positionId: number;
}

export interface ReleaseEmployeePositionPayload {
  employeeId: number;
}

export interface ReleaseEmployeePositionResult {
  employeeId: number;
  positionId: number;
}

export type PositionResponse<T> =
  | { success: true; message?: string; data: T }
  | ApiErrorResponse;

export type PositionListResponse<T> =
  | {
      success: true;
      message?: string;
      data: T[];
      pagination: PaginationMeta;
      summary?: PositionListSummary;
    }
  | ApiErrorResponse;
