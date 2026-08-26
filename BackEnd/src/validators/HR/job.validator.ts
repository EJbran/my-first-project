export const JOB_DEFAULT_PAGE_SIZE = 25;
export const JOB_MAX_PAGE_SIZE = 100;
export const JOB_OPTIONS_DEFAULT_LIMIT = 25;
export const JOB_OPTIONS_MAX_LIMIT = 100;

export const JOB_TEXT_FIELDS = [
  "Job_Name_AR",
  "Job_Name_EN",
  "Job_Family",
  "Career_Level",
  "Role_Criticality",
  "Role_Purpose",
  "Key_Accountabilities",
  "Typical_Deliverables",
  "Minimum_Education_Benchmark",
  "Preferred_Qualifications",
  "Minimum_Experience_Benchmark",
  "Technical_Competencies",
  "Behavioral_Competencies",
  "HSE_Process_Safety_Accountabilities",
  "Mandatory_Training_Licences_Benchmark",
  "Applicable_Standards_Procedures",
  "Decision_Authority",
  "Supervisory_Scope",
  "Key_Interfaces",
  "Work_Environment_and_Schedule",
  "Physical_Medical_Fitness",
  "Competency_Assurance_Method",
  "KPI_Benchmark",
  "Required_Languages",
  "Language_Level_CEFR",
  "Job_Type",
  "Profile_Validation_Owner"
] as const;

export type JobTextField = typeof JOB_TEXT_FIELDS[number];
export const JOB_SORT_FIELDS = [
  "jobId",
  "jobTitle",
  "jobFamily",
  "careerLevel",
  "jobType",
  "criticality"
] as const;
export type JobSortField = typeof JOB_SORT_FIELDS[number];
export type JobSortDirection = "asc" | "desc";

export type ValidationResult<T> =
  | { success: true; value: T }
  | { success: false; errors: string[] };

export interface JobListQuery {
  page: number;
  pageSize: number;
  search: string | null;
  jobFamily: string | null;
  careerLevel: string | null;
  jobType: string | null;
  roleCriticality: string | null;
  sortBy: JobSortField;
  sortDirection: JobSortDirection;
}

export interface JobOptionsQuery {
  search: string | null;
  limit: number;
}

export type CreateJobPayload = Record<JobTextField, string> & {
  Job_ID: number | null;
};

const parsePositiveInteger = (
  value: unknown,
  field: string,
  errors: string[],
  maximum = Number.MAX_SAFE_INTEGER
): number => {
  const normalized = Array.isArray(value) || value === null || value === undefined
    ? ""
    : String(value).trim();
  if (!/^[1-9]\d*$/.test(normalized)) {
    errors.push(`${field} must be a positive integer`);
    return 0;
  }
  const parsed = Number(normalized);
  if (!Number.isSafeInteger(parsed) || parsed > maximum) {
    errors.push(`${field} must be between 1 and ${maximum}`);
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
  return parsePositiveInteger(value, field, errors, maximum) || defaultValue;
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

const parseJobSortField = (value: unknown, errors: string[]): JobSortField => {
  if (value === undefined || value === null || value === "") return "jobId";
  if (Array.isArray(value) || typeof value === "object") {
    errors.push(`sortBy must be one of: ${JOB_SORT_FIELDS.join(", ")}`);
    return "jobId";
  }
  const normalized = String(value).trim();
  if (JOB_SORT_FIELDS.includes(normalized as JobSortField)) {
    return normalized as JobSortField;
  }
  errors.push(`sortBy must be one of: ${JOB_SORT_FIELDS.join(", ")}`);
  return "jobId";
};

const parseJobSortDirection = (
  value: unknown,
  errors: string[]
): JobSortDirection => {
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

export const parseJobListQuery = (
  source: Record<string, unknown>
): ValidationResult<JobListQuery> => {
  const errors: string[] = [];
  const value: JobListQuery = {
    page: parsePageValue(source.page, "page", errors, 1, Number.MAX_SAFE_INTEGER),
    pageSize: parsePageValue(
      source.pageSize,
      "pageSize",
      errors,
      JOB_DEFAULT_PAGE_SIZE,
      JOB_MAX_PAGE_SIZE
    ),
    search: parseOptionalText(source.search, "search", errors),
    jobFamily: parseOptionalText(source.jobFamily, "jobFamily", errors),
    careerLevel: parseOptionalText(source.careerLevel, "careerLevel", errors),
    jobType: parseOptionalText(source.jobType, "jobType", errors),
    roleCriticality: parseOptionalText(
      source.roleCriticality,
      "roleCriticality",
      errors
    ),
    sortBy: parseJobSortField(source.sortBy, errors),
    sortDirection: parseJobSortDirection(source.sortDirection, errors)
  };
  return errors.length ? { success: false, errors } : { success: true, value };
};

export const parseJobOptionsQuery = (
  source: Record<string, unknown>
): ValidationResult<JobOptionsQuery> => {
  const errors: string[] = [];
  const value: JobOptionsQuery = {
    search: parseOptionalText(source.search, "search", errors),
    limit: parsePageValue(
      source.limit,
      "limit",
      errors,
      JOB_OPTIONS_DEFAULT_LIMIT,
      JOB_OPTIONS_MAX_LIMIT
    )
  };
  return errors.length ? { success: false, errors } : { success: true, value };
};

export const validateCreateJobPayload = (
  source: Record<string, unknown>
): ValidationResult<CreateJobPayload> => {
  const errors: string[] = [];
  let jobId: number | null = null;
  if (source.Job_ID !== undefined && source.Job_ID !== null && source.Job_ID !== "") {
    jobId = parsePositiveInteger(source.Job_ID, "Job_ID", errors, 2147483647) || null;
  }

  const text = {} as Record<JobTextField, string>;
  for (const field of JOB_TEXT_FIELDS) {
    const raw = source[field];
    if (typeof raw !== "string" || !raw.trim()) {
      errors.push(`${field} is required`);
      text[field] = "";
      continue;
    }
    text[field] = raw.trim();
  }

  return errors.length
    ? { success: false, errors }
    : { success: true, value: { Job_ID: jobId, ...text } };
};
