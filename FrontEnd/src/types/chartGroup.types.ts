export interface ChartGroup {
  id_AccountGroupCode: number;
  AccountGroupCode: string;
  AccountClassCode: string;
  AccountClassName: string;
  AccountGroupName: string;
  DefaultSuggestedModule: string | null;
  DefaultAnalyticTemplate: string | null;
  AllowedAnalyticTemplates: string | null;
  IsActive: boolean;
  CreatedAt: string;
  UpdatedAt: string;
}

export const ACCOUNT_CLASS_OPTIONS = [
  { code: "1", name: "Assets" },
  { code: "2", name: "Liabilities" },
  { code: "3", name: "Equity" },
  { code: "4", name: "Revenue" },
  { code: "5", name: "Expenses" },
  { code: "6", name: "Allocations" },
  { code: "9", name: "Needs Review" }
] as const;

export const ANALYTIC_TEMPLATE_OPTIONS = [
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

export const SUGGESTED_MODULE_OPTIONS = [
  "Finance",
  "Treasury",
  "Accounts Receivable",
  "Accounts Payable",
  "Inventory",
  "Fixed Assets",
  "Projects / AFE",
  "Payroll",
  "HR",
  "Procurement",
  "Operations",
  "Maintenance",
  "Tax",
  "General Ledger"
] as const;
