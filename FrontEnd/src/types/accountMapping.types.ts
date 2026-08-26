export type LocationAccessMode = "ALL" | "INCLUDE" | "EXCLUDE";

export const LOCATION_ACCESS_MODES: LocationAccessMode[] = ["ALL", "INCLUDE", "EXCLUDE"];

export const locationAccessModeLabel = (mode: LocationAccessMode | string | null | undefined) => {
  switch (String(mode || "ALL").toUpperCase()) {
    case "INCLUDE":
      return "Only selected location";
    case "EXCLUDE":
      return "All locations except selected location";
    case "ALL":
    default:
      return "All locations";
  }
};

export interface AccountMappingEpsa {
  Id: number;
  InterstName: string;
  NOC?: number | null;
  PC?: number | null;
  EPSAType?: string | null;
}

export interface AccountMappingDepartment {
  Id: number;
  DepartmentName_English: string;
  DepartmentName_Arabic: string;
  DepartmentType?: string | null;
}

export interface AccountMappingChartAccount {
  Id: number;
  NewAccountCode: string;
  CleanDescription: string;
  IsActive: boolean;
}

export interface AccountMappingLocation {
  ID_Location: number;
  LocationName_en: string;
  LocationName_ar: string | null;
  LocationCode: string;
}

export interface AccountMapping {
  Id: number;
  EPSAId: number;
  DepartmentId: number;
  ChartAccountId: number | null;
  /** NULL when LocationAccessMode = ALL */
  LocationID: number | null;
  LocationAccessMode: LocationAccessMode | string;
  IsAllAccounts: boolean;
  IsActive: boolean;
  CreatedAt: string;
  UpdatedAt: string;
  Epsa?: AccountMappingEpsa;
  Department?: AccountMappingDepartment;
  ChartAccount?: AccountMappingChartAccount | null;
  Location?: AccountMappingLocation | null;
}

export interface AccountMappingCreatePayload {
  EPSAId: number;
  DepartmentId?: number | null;
  ChartAccountIds?: number[];
  LocationIDs?: number[];
  UseAllActiveAccounts?: boolean;
  LocationAccessMode?: LocationAccessMode;
}

export interface AccountMappingCreateSummary {
  created: number;
  reactivated: number;
  skipped: number;
  mode?: "allAccounts" | "selectedAccounts";
}
