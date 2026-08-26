import {
  AFE_PRIORITIES,
  AFE_PROJECT_NATURES,
  AFE_STATUSES,
  AFE_TYPES
} from "../../model/Finance/afe.constants";

export interface AFEPayload {
  SourceLineNo?: number | null;
  ImportBatchNo?: string | null;
  AFENo?: string | null;
  AFEDescription?: string | null;
  AFEDescriptionArabic?: string | null;
  LegacyDescription?: string | null;
  LegacyLocationCode?: string | null;
  LegacyDepartmentCode?: string | null;
  LegacyDepartmentName?: string | null;
  EPSAId?: number | null;
  DepartmentId?: number | null;
  LocationId?: number | null;
  AFEType?: string | null;
  AFECategory?: string | null;
  ProjectNature?: string | null;
  Priority?: string | null;
  StartDate?: string | null;
  EndDate?: string | null;
  PlannedStartDate?: string | null;
  PlannedEndDate?: string | null;
  CurrencyCode?: string | null;
  EstimatedBudget?: number | null;
  ApprovedBudget?: number | null;
  CommittedAmount?: number | null;
  ActualAmount?: number | null;
  DefaultChartAccountId?: number | null;
  IsBudgetControlled?: boolean | null;
  IsCapitalizable?: boolean | null;
  RequiresAFEOnTransaction?: boolean | null;
  Status?: string | null;
  IsActive?: boolean | null;
  Notes?: string | null;
}

export interface AFEStatusPayload {
  IsActive?: boolean | null;
  Status?: string | null;
}

const toOptionalInt = (value: unknown): number | null => {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return null;
  }

  return Math.trunc(parsed);
};

const toOptionalDecimal = (value: unknown): number | null => {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const toOptionalBool = (value: unknown, fallback: boolean | null = null): boolean | null => {
  if (value === null || value === undefined || value === "") {
    return fallback;
  }

  if (typeof value === "boolean") {
    return value;
  }

  if (value === 1 || value === "1" || value === "true" || value === "TRUE") {
    return true;
  }

  if (value === 0 || value === "0" || value === "false" || value === "FALSE") {
    return false;
  }

  return fallback;
};

const toOptionalDate = (value: unknown): string | null => {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const text = String(value).trim();
  return text || null;
};

const toOptionalText = (value: unknown, max?: number): string | null => {
  if (value === null || value === undefined) {
    return null;
  }

  const text = String(value).trim();
  if (!text) {
    return null;
  }

  return max ? text.slice(0, max) : text;
};

const isAllowed = (value: string | null | undefined, allowed: readonly string[]): boolean =>
  !value || allowed.includes(value);

const dateOrderError = (
  start: string | null | undefined,
  end: string | null | undefined,
  label: string
): string | null => {
  if (!start || !end) {
    return null;
  }

  if (end < start) {
    return `${label} cannot be before its start date`;
  }

  return null;
};

export const normalizeAFEPayload = (payload: AFEPayload): AFEPayload => ({
  SourceLineNo: toOptionalInt(payload.SourceLineNo),
  ImportBatchNo: toOptionalText(payload.ImportBatchNo, 50),
  AFENo: toOptionalText(payload.AFENo, 50),
  AFEDescription: toOptionalText(payload.AFEDescription, 500),
  AFEDescriptionArabic: toOptionalText(payload.AFEDescriptionArabic, 500),
  LegacyDescription: toOptionalText(payload.LegacyDescription, 500),
  LegacyLocationCode: toOptionalText(payload.LegacyLocationCode, 50),
  LegacyDepartmentCode: toOptionalText(payload.LegacyDepartmentCode, 50),
  LegacyDepartmentName: toOptionalText(payload.LegacyDepartmentName, 200),
  EPSAId: toOptionalInt(payload.EPSAId),
  DepartmentId: toOptionalInt(payload.DepartmentId),
  LocationId: toOptionalInt(payload.LocationId),
  AFEType: (toOptionalText(payload.AFEType, 50) || "GENERAL").toUpperCase(),
  AFECategory: toOptionalText(payload.AFECategory, 100),
  ProjectNature: toOptionalText(payload.ProjectNature, 50)?.toUpperCase() || null,
  Priority: toOptionalText(payload.Priority, 50)?.toUpperCase() || null,
  StartDate: toOptionalDate(payload.StartDate),
  EndDate: toOptionalDate(payload.EndDate),
  PlannedStartDate: toOptionalDate(payload.PlannedStartDate),
  PlannedEndDate: toOptionalDate(payload.PlannedEndDate),
  CurrencyCode: (toOptionalText(payload.CurrencyCode, 10) || "LYD").toUpperCase(),
  EstimatedBudget: toOptionalDecimal(payload.EstimatedBudget),
  ApprovedBudget: toOptionalDecimal(payload.ApprovedBudget),
  CommittedAmount: toOptionalDecimal(payload.CommittedAmount) ?? 0,
  ActualAmount: toOptionalDecimal(payload.ActualAmount) ?? 0,
  DefaultChartAccountId: toOptionalInt(payload.DefaultChartAccountId),
  IsBudgetControlled: toOptionalBool(payload.IsBudgetControlled, false),
  IsCapitalizable: toOptionalBool(payload.IsCapitalizable, null),
  RequiresAFEOnTransaction: toOptionalBool(payload.RequiresAFEOnTransaction, true),
  Status: (toOptionalText(payload.Status, 50) || "ACTIVE").toUpperCase(),
  IsActive: toOptionalBool(payload.IsActive, true),
  Notes: toOptionalText(payload.Notes)
});

export const validateAFEPayload = (payload: AFEPayload): string[] => {
  const errors: string[] = [];

  if (!payload.AFENo) {
    errors.push("AFENo is required");
  } else if (payload.AFENo.length > 50) {
    errors.push("AFENo must be at most 50 characters");
  }

  // Intentionally NO uniqueness check on AFENo — duplicates are valid.

  if (!payload.AFEDescription) {
    errors.push("AFEDescription is required");
  } else if (payload.AFEDescription.length > 500) {
    errors.push("AFEDescription must be at most 500 characters");
  }

  if (payload.AFEDescriptionArabic && payload.AFEDescriptionArabic.length > 500) {
    errors.push("AFEDescriptionArabic must be at most 500 characters");
  }

  if (payload.LegacyDescription && payload.LegacyDescription.length > 500) {
    errors.push("LegacyDescription must be at most 500 characters");
  }

  if (!payload.AFEType) {
    errors.push("AFEType is required");
  } else if (!isAllowed(payload.AFEType, AFE_TYPES)) {
    errors.push(`AFEType must be one of: ${AFE_TYPES.join(", ")}`);
  }

  if (!payload.Status) {
    errors.push("Status is required");
  } else if (!isAllowed(payload.Status, AFE_STATUSES)) {
    errors.push(`Status must be one of: ${AFE_STATUSES.join(", ")}`);
  }

  if (!payload.CurrencyCode) {
    errors.push("CurrencyCode is required");
  }

  if (!isAllowed(payload.ProjectNature, AFE_PROJECT_NATURES)) {
    errors.push(`ProjectNature must be one of: ${AFE_PROJECT_NATURES.join(", ")}`);
  }

  if (!isAllowed(payload.Priority, AFE_PRIORITIES)) {
    errors.push(`Priority must be one of: ${AFE_PRIORITIES.join(", ")}`);
  }

  const budgetFields: Array<[keyof AFEPayload, string]> = [
    ["EstimatedBudget", "EstimatedBudget"],
    ["ApprovedBudget", "ApprovedBudget"],
    ["CommittedAmount", "CommittedAmount"],
    ["ActualAmount", "ActualAmount"]
  ];

  budgetFields.forEach(([key, label]) => {
    const value = payload[key];
    if (typeof value === "number" && value < 0) {
      errors.push(`${label} must be greater than or equal to 0`);
    }
  });

  const endDateError = dateOrderError(payload.StartDate, payload.EndDate, "EndDate");
  if (endDateError) {
    errors.push(endDateError);
  }

  const plannedEndError = dateOrderError(
    payload.PlannedStartDate,
    payload.PlannedEndDate,
    "PlannedEndDate"
  );
  if (plannedEndError) {
    errors.push(plannedEndError);
  }

  return errors;
};

export const normalizeAFEStatusPayload = (payload: AFEStatusPayload): AFEStatusPayload => ({
  IsActive:
    payload.IsActive === undefined
      ? undefined
      : toOptionalBool(payload.IsActive, true) ?? true,
  Status: payload.Status
    ? (toOptionalText(payload.Status, 50) || "ACTIVE").toUpperCase()
    : undefined
});

export const validateAFEStatusPayload = (payload: AFEStatusPayload): string[] => {
  const errors: string[] = [];

  if (payload.Status !== undefined && !isAllowed(payload.Status, AFE_STATUSES)) {
    errors.push(`Status must be one of: ${AFE_STATUSES.join(", ")}`);
  }

  if (payload.IsActive === undefined && payload.Status === undefined) {
    errors.push("Provide IsActive and/or Status");
  }

  return errors;
};
