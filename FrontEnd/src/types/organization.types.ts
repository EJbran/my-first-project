export type OrganizationLeaderResolutionStatus =
  | "resolved"
  | "unassigned"
  | "ambiguous"
  | "unsupported-type";

export interface OrganizationHierarchyLeader {
  employeeId: number;
  employeeNumber: string | null;
  displayName: string;
  nameEnglish: string | null;
  nameArabic: string | null;
  titleEnglish: string | null;
  titleArabic: string | null;
  lineLevelEnglish: string | null;
  profileImageUrl: string | null;
}

export interface OrganizationHierarchyNodeRecord {
  departmentId: number;
  parentDepartmentId: number | null;
  depth: number;
  nameEnglish: string | null;
  nameArabic: string | null;
  departmentType: string | null;
  childDepartmentCount: number;
  directEmployeeCount: number;
  activeEmployeeCount: number;
  leaderStatus: OrganizationLeaderResolutionStatus;
  expectedLineLevel: string | null;
  exactCandidateCount: number;
  leadershipCandidateCount: number;
  leader: OrganizationHierarchyLeader | null;
}

export interface OrganizationHierarchyMeta {
  requestedRootId: number | null;
  maxDepth: number;
  nodeCount: number;
  rootDepartmentIds: number[];
  orphanDepartmentIds: number[];
  truncatedByMaxDepth: boolean;
}

export type OrganizationHierarchyResponse =
  | {
      success: true;
      data: OrganizationHierarchyNodeRecord[];
      meta: OrganizationHierarchyMeta;
    }
  | {
      success: false;
      message: string;
      errors?: string[];
    };
