import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { organizationApi } from "../../../api/organization.api";
import type {
  OrganizationHierarchyMeta,
  OrganizationHierarchyNodeRecord
} from "../../../types/organization.types";
import {
  EmployeeDirectoryView,
  type EmployeeDirectoryRow
} from "./EmployeeDirectoryView";
import {
  EmployeeHierarchyView,
  type EmployeeHierarchyNode,
  type EmployeeHierarchyRow
} from "./EmployeeHierarchyView";

type EmployeeViewMode = "table" | "hierarchy";

const hierarchyRowFromRecord = (
  record: OrganizationHierarchyNodeRecord
): EmployeeHierarchyRow => ({
  departmentId: record.departmentId,
  parentDepartmentId: record.parentDepartmentId,
  departmentNameEnglish: record.nameEnglish,
  departmentNameArabic: record.nameArabic,
  departmentType: record.departmentType,
  childDepartmentCount: record.childDepartmentCount,
  directEmployeeCount: record.directEmployeeCount,
  leaderStatus: record.leaderStatus,
  expectedLineLevel: record.expectedLineLevel,
  employeeId: record.leader?.employeeId ?? null,
  employeeNumber: record.leader?.employeeNumber ?? null,
  displayName: record.leader?.displayName ?? null,
  nameArabic: record.leader?.nameArabic ?? null,
  titleEnglish: record.leader?.titleEnglish ?? null,
  titleArabic: record.leader?.titleArabic ?? null,
  lineLevelEnglish: record.leader?.lineLevelEnglish ?? null,
  profileImageUrl: record.leader?.profileImageUrl ?? null
});

const buildHierarchyTree = (
  records: OrganizationHierarchyNodeRecord[] | undefined,
  meta: OrganizationHierarchyMeta | undefined
): EmployeeHierarchyNode[] => {
  if (!records) return [];

  const nodeByDepartmentId = new Map<number, EmployeeHierarchyNode>();
  records.forEach((record) => {
    nodeByDepartmentId.set(record.departmentId, {
      row: hierarchyRowFromRecord(record),
      children: []
    });
  });

  const roots: EmployeeHierarchyNode[] = [];
  records.forEach((record) => {
    const node = nodeByDepartmentId.get(record.departmentId);
    if (!node) return;

    const parent = record.parentDepartmentId
      ? nodeByDepartmentId.get(record.parentDepartmentId)
      : undefined;
    if (parent) {
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  });

  const compareNodes = (left: EmployeeHierarchyNode, right: EmployeeHierarchyNode) =>
    (left.row.departmentNameEnglish || left.row.departmentNameArabic || "")
      .localeCompare(
        right.row.departmentNameEnglish || right.row.departmentNameArabic || "",
        undefined,
        { sensitivity: "base", numeric: true }
      );
  const sortTree = (nodes: EmployeeHierarchyNode[]) => {
    nodes.sort(compareNodes);
    nodes.forEach((node) => sortTree(node.children));
  };
  sortTree(roots);

  const rootOrder = new Map(
    (meta?.rootDepartmentIds ?? []).map((departmentId, index) => [departmentId, index])
  );
  roots.sort((left, right) =>
    (rootOrder.get(left.row.departmentId) ?? Number.MAX_SAFE_INTEGER)
    - (rootOrder.get(right.row.departmentId) ?? Number.MAX_SAFE_INTEGER)
  );

  return roots;
};

export default function EmployeesPage() {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<EmployeeViewMode>("table");
  const hierarchyQuery = useQuery({
    queryKey: ["organization", "employee-hierarchy"],
    queryFn: () => organizationApi.getHierarchy({ maxDepth: 8 }),
    enabled: viewMode === "hierarchy",
    retry: 1,
    staleTime: 5 * 60_000
  });

  const hierarchyRecords = hierarchyQuery.data?.success
    ? hierarchyQuery.data.data
    : undefined;
  const hierarchyMeta = hierarchyQuery.data?.success
    ? hierarchyQuery.data.meta
    : undefined;
  const employeeHierarchy = useMemo(
    () => buildHierarchyTree(hierarchyRecords, hierarchyMeta),
    [hierarchyMeta, hierarchyRecords]
  );
  const hierarchyError = hierarchyQuery.data && !hierarchyQuery.data.success
    ? hierarchyQuery.data.message
    : hierarchyQuery.error instanceof Error
      ? hierarchyQuery.error.message
      : null;

  const openEmployeeProfile = (employee: EmployeeDirectoryRow) => {
    navigate(`/human-resources/employees/employee-profile/${employee.id}`, {
      state: { employee }
    });
  };

  if (viewMode === "hierarchy") {
    return (
      <EmployeeHierarchyView
        nodes={employeeHierarchy}
        loading={hierarchyQuery.isPending}
        error={hierarchyError}
        orphanCount={hierarchyMeta?.orphanDepartmentIds.length ?? 0}
        onRetry={() => void hierarchyQuery.refetch()}
        onShowList={() => setViewMode("table")}
        onOpenProfile={(employee) => {
          if (!employee.employeeId) return;
          navigate(`/human-resources/employees/employee-profile/${employee.employeeId}`);
        }}
      />
    );
  }

  return (
    <EmployeeDirectoryView
      onShowHierarchy={() => setViewMode("hierarchy")}
      onOpenProfile={openEmployeeProfile}
    />
  );
}
