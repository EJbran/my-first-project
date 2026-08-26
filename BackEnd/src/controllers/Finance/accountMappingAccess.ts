import type { LocationAccessMode } from "../../model/Finance/EpsaDepartmentChartAccount";

export type MappingAccessRow = {
  IsActive: boolean;
  EPSAId: number;
  DepartmentId: number;
  ChartAccountId: number | null;
  IsAllAccounts: boolean;
  LocationID: number | null;
  LocationAccessMode: LocationAccessMode | string;
};

/**
 * Account allowed when:
 * - active IsAllAccounts=true + ChartAccountId NULL, or
 * - active IsAllAccounts=false + ChartAccountId matches
 */
export const isAccountAllowedByMappings = (
  rows: MappingAccessRow[],
  chartAccountId: number
): boolean => {
  const active = rows.filter((row) => row.IsActive);
  if (active.some((row) => row.IsAllAccounts && row.ChartAccountId == null)) {
    return true;
  }

  return active.some(
    (row) => !row.IsAllAccounts && Number(row.ChartAccountId) === Number(chartAccountId)
  );
};

/**
 * Location allowed when matching account-scoped rows allow it:
 * - ALL
 * - INCLUDE and LocationID matches
 * - EXCLUDE and no EXCLUDE row for that LocationID (among account-matching rows)
 */
export const isLocationAllowedByMappings = (
  rows: MappingAccessRow[],
  locationId: number,
  chartAccountId: number | null,
  requireAccountMatch = true
): boolean => {
  const active = rows.filter((row) => {
    if (!row.IsActive) {
      return false;
    }

    if (!requireAccountMatch) {
      return true;
    }

    if (chartAccountId == null) {
      return row.IsAllAccounts && row.ChartAccountId == null;
    }

    return (
      (row.IsAllAccounts && row.ChartAccountId == null) ||
      (!row.IsAllAccounts && Number(row.ChartAccountId) === Number(chartAccountId))
    );
  });

  if (!active.length) {
    return false;
  }

  if (active.some((row) => String(row.LocationAccessMode).toUpperCase() === "ALL")) {
    return true;
  }

  const includes = active.filter(
    (row) => String(row.LocationAccessMode).toUpperCase() === "INCLUDE"
  );
  const excludes = active.filter(
    (row) => String(row.LocationAccessMode).toUpperCase() === "EXCLUDE"
  );

  if (includes.length) {
    return includes.some((row) => Number(row.LocationID) === Number(locationId));
  }

  if (excludes.length) {
    return !excludes.some((row) => Number(row.LocationID) === Number(locationId));
  }

  return false;
};

export const isMappingAllowed = (params: {
  rows: MappingAccessRow[];
  epsaId: number;
  departmentId: number;
  locationId: number;
  chartAccountId: number;
}): boolean => {
  const scoped = params.rows.filter(
    (row) =>
      row.IsActive &&
      Number(row.EPSAId) === Number(params.epsaId) &&
      Number(row.DepartmentId) === Number(params.departmentId)
  );

  if (!isAccountAllowedByMappings(scoped, params.chartAccountId)) {
    return false;
  }

  return isLocationAllowedByMappings(scoped, params.locationId, params.chartAccountId);
};
