import type { ApiErrorResponse, PaginationMeta } from "./common.types";

export interface JobProfileFields {
  Job_ID: number;
  Job_Name_AR: string;
  Job_Name_EN: string;
  Job_Family: string;
  Career_Level: string;
  Role_Criticality: string;
  Role_Purpose: string;
  Key_Accountabilities: string;
  Typical_Deliverables: string;
  Minimum_Education_Benchmark: string;
  Preferred_Qualifications: string;
  Minimum_Experience_Benchmark: string;
  Technical_Competencies: string;
  Behavioral_Competencies: string;
  HSE_Process_Safety_Accountabilities: string;
  Mandatory_Training_Licences_Benchmark: string;
  Applicable_Standards_Procedures: string;
  Decision_Authority: string;
  Supervisory_Scope: string;
  Key_Interfaces: string;
  Work_Environment_and_Schedule: string;
  Physical_Medical_Fitness: string;
  Competency_Assurance_Method: string;
  KPI_Benchmark: string;
  Required_Languages: string;
  Language_Level_CEFR: string;
  Job_Type: string;
  Profile_Validation_Owner: string;
}

export interface JobPositionCounts {
  TotalPositions: number;
  OccupiedPositions: number;
  VacantPositions: number;
}

export interface JobCatalogSummary {
  totalJobs: number;
  jobFamilies: number;
  criticalRoles: number;
  underReview: number;
}

export type JobSummary = Pick<
  JobProfileFields,
  | "Job_ID"
  | "Job_Name_AR"
  | "Job_Name_EN"
  | "Job_Family"
  | "Career_Level"
  | "Role_Criticality"
  | "Job_Type"
> & Partial<JobPositionCounts>;

export type JobRecord = JobProfileFields & Partial<JobPositionCounts>;

export type JobCreatePayload = Omit<JobProfileFields, "Job_ID"> & {
  Job_ID?: number;
};

export interface JobOption {
  JobId: number;
  Job_Name_AR: string;
  Job_Name_EN: string;
  Job_Family: string;
}

export interface JobOptions {
  jobs: JobOption[];
  jobFamilies: string[];
  careerLevels: string[];
  jobTypes: string[];
  roleCriticalities: string[];
}

export interface JobListParams {
  page?: number;
  pageSize?: number;
  search?: string;
  jobFamily?: string;
  careerLevel?: string;
  jobType?: string;
  roleCriticality?: string;
  sortBy?: "jobId" | "jobTitle" | "jobFamily" | "careerLevel" | "jobType" | "criticality";
  sortDirection?: "asc" | "desc";
}

export type JobResponse<T> =
  | { success: true; message?: string; data: T }
  | ApiErrorResponse;

export type JobListResponse =
  | {
      success: true;
      message?: string;
      data: JobSummary[];
      pagination: PaginationMeta;
      summary: JobCatalogSummary;
    }
  | ApiErrorResponse;
