import { httpClient } from "./httpClient";
import type { ApiListResponse, ApiResponse, QueryParams } from "../types/api.types";
import type { ChartGroup } from "../types/chartGroup.types";

export const chartGroupsApi = {
  list: async (params?: QueryParams) => {
    const response = await httpClient.get<ApiListResponse<ChartGroup>>("/chart-groups", { params });
    return response.data;
  },
  getById: async (id: string) => {
    const response = await httpClient.get<ApiResponse<ChartGroup>>(`/chart-groups/${id}`);
    return response.data;
  },
  create: async (payload: Partial<ChartGroup>) => httpClient.post("/chart-groups", payload),
  update: async (id: string, payload: Partial<ChartGroup>) =>
    httpClient.put(`/chart-groups/${id}`, payload),
  remove: async (id: string) => httpClient.delete(`/chart-groups/${id}`)
};
