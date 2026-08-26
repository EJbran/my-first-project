import {
  ACCOUNT_CLASS_NAMES,
  ANALYTIC_TEMPLATES,
  getTypeClassMismatchWarning,
  LEGACY_ACCOUNT_TYPES,
  NEW_ACCOUNT_CODE_REGEX
} from "../../model/Finance/chartOfAccounts.constants";

export interface ChartOfAccountsPayload {
  NewAccountCode?: string | null;
  Type?: string | null;
  LegacyAcct?: string | null;
  CleanDescription?: string | null;
  LegacyDescription?: string | null;
  AccountClassName?: string | null;
  AccountGroupCode?: string | null;
  AccountGroupName?: string | null;
  SuggestedModule?: string | null;
  AnalyticTemplate?: string | null;
  IsActive?: boolean | null;
}

const toOptionalBoolean = (value: unknown, defaultValue = true): boolean => {
  if (value === null || value === undefined || value === "") {
    return defaultValue;
  }

  if (typeof value === "boolean") {
    return value;
  }

  if (value === 1 || value === "1" || value === "true" || value === "True") {
    return true;
  }

  if (value === 0 || value === "0" || value === "false" || value === "False") {
    return false;
  }

  return defaultValue;
};

const normalizeDescription = (value: string | null | undefined): string | null => {
  if (!value) {
    return null;
  }

  return value.trim().replace(/\s+/g, " ");
};

export const normalizeChartOfAccountsPayload = (
  payload: ChartOfAccountsPayload
): ChartOfAccountsPayload => ({
  NewAccountCode: payload.NewAccountCode?.trim().toUpperCase() || null,
  Type: payload.Type?.trim().toUpperCase() || null,
  LegacyAcct: payload.LegacyAcct?.trim() || null,
  CleanDescription: normalizeDescription(payload.CleanDescription),
  LegacyDescription: normalizeDescription(payload.LegacyDescription),
  AccountClassName: payload.AccountClassName?.trim() || null,
  AccountGroupCode: payload.AccountGroupCode?.trim() || null,
  AccountGroupName: payload.AccountGroupName?.trim() || null,
  SuggestedModule: payload.SuggestedModule?.trim() || null,
  AnalyticTemplate: payload.AnalyticTemplate?.trim().toUpperCase() || null,
  IsActive: toOptionalBoolean(payload.IsActive, true)
});

export const validateChartOfAccountsPayload = (payload: ChartOfAccountsPayload): string[] => {
  const errors: string[] = [];

  if (!payload.NewAccountCode) {
    errors.push("NewAccountCode is required");
  } else if (!NEW_ACCOUNT_CODE_REGEX.test(payload.NewAccountCode)) {
    errors.push("NewAccountCode must match format ClassCode-AccountGroupCode-Sequence (e.g. 1-101-0001)");
  } else {
    const parts = payload.NewAccountCode.split("-");
    if (payload.AccountGroupCode && parts[1] !== payload.AccountGroupCode) {
      errors.push("NewAccountCode AccountGroupCode segment must match AccountGroupCode");
    }

    if (payload.LegacyAcct) {
      const legacy = payload.LegacyAcct.trim();
      const sequence = parts[2] || "";
      const legacyInCode =
        payload.NewAccountCode.includes(legacy) ||
        sequence === legacy ||
        sequence === legacy.padStart(4, "0");

      if (legacyInCode) {
        errors.push("NewAccountCode must not contain LegacyAcct");
      }
    }
  }

  if (payload.Type && !LEGACY_ACCOUNT_TYPES.includes(payload.Type as never)) {
    errors.push("Type must be one of: A, L, R, E");
  }

  if (!payload.CleanDescription) {
    errors.push("CleanDescription is required");
  } else if (payload.CleanDescription.length > 500) {
    errors.push("CleanDescription must be at most 500 characters");
  }

  if (payload.LegacyDescription && payload.LegacyDescription.length > 500) {
    errors.push("LegacyDescription must be at most 500 characters");
  }

  if (payload.LegacyAcct && payload.LegacyAcct.length > 20) {
    errors.push("LegacyAcct must be at most 20 characters");
  }

  if (!payload.AccountClassName) {
    errors.push("AccountClassName is required");
  } else if (!ACCOUNT_CLASS_NAMES.includes(payload.AccountClassName)) {
    errors.push(
      "AccountClassName must be one of: Assets, Liabilities, Equity, Revenue, Expenses, Allocations, Needs Review"
    );
  }

  if (!payload.AccountGroupCode) {
    errors.push("AccountGroupCode is required");
  } else if (!/^\d{3}$/.test(payload.AccountGroupCode)) {
    errors.push("AccountGroupCode must be exactly 3 digits");
  }

  if (!payload.AccountGroupName) {
    errors.push("AccountGroupName is required");
  } else if (payload.AccountGroupName.length > 200) {
    errors.push("AccountGroupName must be at most 200 characters");
  }

  if (payload.SuggestedModule && payload.SuggestedModule.length > 100) {
    errors.push("SuggestedModule must be at most 100 characters");
  }

  if (
    payload.AnalyticTemplate &&
    !ANALYTIC_TEMPLATES.includes(payload.AnalyticTemplate as never)
  ) {
    errors.push(`AnalyticTemplate must be one of: ${ANALYTIC_TEMPLATES.join(", ")}`);
  }

  return errors;
};

export const buildTypeClassWarning = (payload: ChartOfAccountsPayload): string | null =>
  getTypeClassMismatchWarning(payload.Type, payload.AccountClassName);
