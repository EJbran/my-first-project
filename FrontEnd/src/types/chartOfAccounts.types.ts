export interface ChartOfAccounts {
  Id: number;
  NewAccountCode: string;
  Type: string | null;
  LegacyAcct: string | null;
  CleanDescription: string;
  LegacyDescription: string | null;
  AccountClassName: string;
  AccountGroupCode: string;
  AccountGroupName: string;
  SuggestedModule: string | null;
  AnalyticTemplate: string | null;
  IsActive: boolean;
  CreatedAt: string;
  UpdatedAt: string;
}

export const LEGACY_ACCOUNT_TYPE_OPTIONS = ["A", "L", "R", "E"] as const;
