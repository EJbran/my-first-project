import {
  ACCOUNT_CLASS_BY_CODE,
  ACCOUNT_CLASS_CODES,
  ACCOUNT_CLASS_NAMES,
  ANALYTIC_TEMPLATES
} from "../../model/Finance/chartOfAccounts.constants";

export interface CoaAccountGroupPayload {
  AccountGroupCode?: string | null;
  AccountClassCode?: string | null;
  AccountClassName?: string | null;
  AccountGroupName?: string | null;
  DefaultSuggestedModule?: string | null;
  DefaultAnalyticTemplate?: string | null;
  AllowedAnalyticTemplates?: string | null;
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

const normalizeName = (value: string | null | undefined): string | null => {
  if (!value) {
    return null;
  }

  return value.trim().replace(/\s+/g, " ");
};

const parseAllowedTemplates = (value: string | null | undefined): string[] => {
  if (!value) {
    return [];
  }

  return value
    .split(/[,;|]/)
    .map((item) => item.trim().toUpperCase())
    .filter(Boolean);
};

export const normalizeCoaAccountGroupPayload = (
  payload: CoaAccountGroupPayload
): CoaAccountGroupPayload => {
  const accountClassCode = payload.AccountClassCode?.toString().trim() || null;
  const normalizedClassName = payload.AccountClassName?.trim() || null;
  const inferredClassName = accountClassCode
    ? ACCOUNT_CLASS_BY_CODE[accountClassCode] || null
    : null;

  const allowedList = parseAllowedTemplates(payload.AllowedAnalyticTemplates);

  return {
    AccountGroupCode: payload.AccountGroupCode?.trim() || null,
    AccountClassCode: accountClassCode,
    AccountClassName: normalizedClassName || inferredClassName,
    AccountGroupName: normalizeName(payload.AccountGroupName),
    DefaultSuggestedModule: payload.DefaultSuggestedModule?.trim() || null,
    DefaultAnalyticTemplate: payload.DefaultAnalyticTemplate?.trim().toUpperCase() || null,
    AllowedAnalyticTemplates: allowedList.length ? allowedList.join(",") : null,
    IsActive: toOptionalBoolean(payload.IsActive, true)
  };
};

export const validateCoaAccountGroupPayload = (payload: CoaAccountGroupPayload): string[] => {
  const errors: string[] = [];

  if (!payload.AccountClassCode) {
    errors.push("AccountClassCode is required");
  } else if (!ACCOUNT_CLASS_CODES.includes(payload.AccountClassCode)) {
    errors.push("AccountClassCode must be one of: 1, 2, 3, 4, 5, 6, 9");
  }

  if (!payload.AccountClassName) {
    errors.push("AccountClassName is required");
  } else if (!ACCOUNT_CLASS_NAMES.includes(payload.AccountClassName)) {
    errors.push(
      "AccountClassName must be one of: Assets, Liabilities, Equity, Revenue, Expenses, Allocations, Needs Review"
    );
  } else if (
    payload.AccountClassCode &&
    ACCOUNT_CLASS_BY_CODE[payload.AccountClassCode] !== payload.AccountClassName
  ) {
    errors.push("AccountClassCode and AccountClassName must match");
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

  if (payload.DefaultSuggestedModule && payload.DefaultSuggestedModule.length > 100) {
    errors.push("DefaultSuggestedModule must be at most 100 characters");
  }

  if (
    payload.DefaultAnalyticTemplate &&
    !ANALYTIC_TEMPLATES.includes(payload.DefaultAnalyticTemplate as never)
  ) {
    errors.push(`DefaultAnalyticTemplate must be one of: ${ANALYTIC_TEMPLATES.join(", ")}`);
  }

  const allowedTemplates = parseAllowedTemplates(payload.AllowedAnalyticTemplates);
  for (const template of allowedTemplates) {
    if (!ANALYTIC_TEMPLATES.includes(template as never)) {
      errors.push(`AllowedAnalyticTemplates contains invalid value: ${template}`);
    }
  }

  if (
    payload.DefaultAnalyticTemplate &&
    allowedTemplates.length > 0 &&
    !allowedTemplates.includes(payload.DefaultAnalyticTemplate)
  ) {
    errors.push("DefaultAnalyticTemplate must be included in AllowedAnalyticTemplates");
  }

  if (payload.AllowedAnalyticTemplates && payload.AllowedAnalyticTemplates.length > 500) {
    errors.push("AllowedAnalyticTemplates must be at most 500 characters");
  }

  return errors;
};
