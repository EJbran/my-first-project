export interface Department {
  Id: number;
  DepartmentName_Arabic: string;
  DepartmentName_English: string;
  DepartmentType: string | null;
  AttachedNumber: number | null;
  DepartmentAddress: string;
  DepartmentPhone: string;
  DepartmentExtenstion: string;
}

export type DepartmentLeaderResolutionStatus =
  | "resolved"
  | "unassigned"
  | "ambiguous"
  | "unsupported-type";

export interface DepartmentHierarchyLeader {
  departmentId: number;
  status: DepartmentLeaderResolutionStatus;
  expectedLineLevel: string | null;
  exactCandidateCount: number;
  leadershipCandidateCount: number;
  leader: {
    employeeId: number;
    employeeNumber: string | null;
    displayName: string;
    nameEnglish: string | null;
    nameArabic: string | null;
    titleEnglish: string | null;
    titleArabic: string | null;
    lineLevelEnglish: string | null;
    profileImageUrl: string | null;
  } | null;
}
