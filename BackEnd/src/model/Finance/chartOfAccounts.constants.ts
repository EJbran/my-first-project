export const ACCOUNT_CLASS_BY_CODE: Record<string, string> = {
  "1": "Assets",
  "2": "Liabilities",
  "3": "Equity",
  "4": "Revenue",
  "5": "Expenses",
  "6": "Allocations",
  "9": "Needs Review"
};

export const ACCOUNT_CLASS_CODES = Object.keys(ACCOUNT_CLASS_BY_CODE);
export const ACCOUNT_CLASS_NAMES = Object.values(ACCOUNT_CLASS_BY_CODE);

export const ANALYTIC_TEMPLATES = [
  "NONE",
  "COST_CENTER",
  "LOCATION",
  "PROJECT_AFE",
  "EMPLOYEE",
  "VENDOR",
  "CUSTOMER_OWNER",
  "CURRENCY",
  "EPSA",
  "DEPARTMENT_LOCATION",
  "FULL_ANALYTIC"
] as const;

export type AnalyticTemplate = (typeof ANALYTIC_TEMPLATES)[number];

export const LEGACY_ACCOUNT_TYPES = ["A", "L", "R", "E"] as const;
export type LegacyAccountType = (typeof LEGACY_ACCOUNT_TYPES)[number];

export const NEW_ACCOUNT_CODE_REGEX = /^\d-\d{3}-\d{4}$/;

/** Expected AccountClassName values for a legacy Type. L may be Liabilities or Equity. */
export const TYPE_TO_CLASS_NAMES: Record<LegacyAccountType, string[]> = {
  A: ["Assets"],
  L: ["Liabilities", "Equity"],
  R: ["Revenue"],
  E: ["Expenses"]
};

export const getTypeClassMismatchWarning = (
  type: string | null | undefined,
  accountClassName: string | null | undefined
): string | null => {
  if (!type || !accountClassName) {
    return null;
  }

  const expected = TYPE_TO_CLASS_NAMES[type as LegacyAccountType];
  if (!expected) {
    return null;
  }

  if (expected.includes(accountClassName)) {
    return null;
  }

  return `Type "${type}" normally maps to ${expected.join(" or ")}, but AccountClassName is "${accountClassName}". Finance review recommended.`;
};
