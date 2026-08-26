import type { ApiListResponse, ApiResponse } from "../types/api.types";
import type {
  EmployeeCreatePayload,
  EmployeeDeleteResult,
  EmployeeListRecord,
  EmployeeRecord,
  EmployeeSearchOptions,
  EmployeeSearchRequest,
  EmployeeUpdatePayload
} from "../types/employee.types";
import { httpClient } from "./httpClient";

export const employeesApi = {
  list: async () => {
    const response = await httpClient.get<ApiResponse<EmployeeListRecord[]>>("/employees");
    return response.data;
  },
  search: async (params: EmployeeSearchRequest) => {
    const response = await httpClient.get<ApiListResponse<EmployeeListRecord>>("/employees/search", { params });
    return response.data;
  },
  searchOptions: async () => {
    const response = await httpClient.get<ApiResponse<EmployeeSearchOptions>>("/employees/search-options");
    return response.data;
  },
  create: async (payload: EmployeeCreatePayload) => {
    const response = await httpClient.post<ApiResponse<EmployeeRecord>>("/employees", payload);
    return response.data;
  },
  update: async (id: string | number, payload: EmployeeUpdatePayload) => {
    const response = await httpClient.put<ApiResponse<EmployeeRecord>>(`/employees/${id}`, payload);
    return response.data;
  },
  remove: async (id: string | number) => {
    const response = await httpClient.delete<ApiResponse<EmployeeDeleteResult>>(`/employees/${id}`);
    return response.data;
  },
  getById: async (id: string | number) => {
    const response = await httpClient.get<ApiResponse<EmployeeRecord>>(`/employees/${id}`);
    return response.data;
  }
};
