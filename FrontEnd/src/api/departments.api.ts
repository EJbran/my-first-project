import { httpClient } from "./httpClient";
import type { ApiListResponse, ApiResponse, QueryParams } from "../types/api.types";
import type { Department, DepartmentHierarchyLeader } from "../types/department.types";

export const departmentsApi = {
  list: async (params?: QueryParams) => {
    const response = await httpClient.get<ApiListResponse<Department>>("/departments", { params });
    return response.data;
  },
  getById: async (id: string) => {
    const response = await httpClient.get<ApiResponse<Department>>(`/departments/${id}`);
    return response.data;
  },
  getHierarchyLeaders: async (ids: number[]) => {
    const response = await httpClient.get<ApiResponse<DepartmentHierarchyLeader[]>>(
      "/departments/hierarchy-leaders",
      { params: { ids: ids.join(",") } }
    );
    return response.data;
  },
  create: async (payload: Partial<Department>) => httpClient.post("/departments", payload),
  update: async (id: string, payload: Partial<Department>) => httpClient.put(`/departments/${id}`, payload),
  remove: async (id: string) => httpClient.delete(`/departments/${id}`)
};
