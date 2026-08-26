import type { ApiResponse } from "../types/api.types";
import type { HrDashboardData, HrDashboardFilters } from "../types/hrDashboard.types";
import { httpClient } from "./httpClient";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const isDashboardPayload = (value: unknown): value is HrDashboardData => {
  if (!isRecord(value) || typeof value.asOf !== "string") return false;
  if (!isRecord(value.kpis) || !isRecord(value.series) || !isRecord(value.availableFilters)) return false;
  return Array.isArray(value.series.agePyramid)
    && Array.isArray(value.series.employmentStatus)
    && Array.isArray(value.series.gender)
    && Array.isArray(value.availableFilters.statuses)
    && Array.isArray(value.availableFilters.workLocations)
    && Array.isArray(value.availableFilters.genders)
    && Array.isArray(value.availableFilters.contractTypes)
    && Array.isArray(value.unavailable);
};

const toQueryParams = (filters: HrDashboardFilters) => ({
  status: filters.status === "all" ? undefined : filters.status,
  department: filters.department === "all" ? undefined : filters.department,
  locationId: filters.workLocation === "all" ? undefined : filters.workLocation,
  gender: filters.gender === "all" ? undefined : filters.gender,
  contractType: filters.contractType === "all" ? undefined : filters.contractType,
  employeeType: filters.employeeType === "all" ? undefined : filters.employeeType,
  job: filters.job === "all" ? undefined : filters.job,
  nationality: filters.nationality === "all" ? undefined : filters.nationality,
  ageBand: filters.ageBand === "all" ? undefined : filters.ageBand,
  contractRisk: filters.contractRisk === "all" ? undefined : filters.contractRisk,
  seniorityMilestone: filters.seniorityMilestone === "all" ? undefined : filters.seniorityMilestone
});

export const hrDashboardApi = {
  get: async (filters: HrDashboardFilters) => {
    const response = await httpClient.get<ApiResponse<HrDashboardData>>("/employees/dashboard", {
      params: toQueryParams(filters)
    });
    if (!response.data.success) {
      throw new Error(response.data.message);
    }
    if (!isDashboardPayload(response.data.data)) {
      throw new Error("The HR dashboard API returned an incomplete analytics payload");
    }
    return response.data.data;
  }
};
