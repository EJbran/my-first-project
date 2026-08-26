import { httpClient } from "./httpClient";
import type { ApiListResponse, ApiResponse, QueryParams } from "../types/api.types";
import type { SubLocation } from "../types/subLocation.types";

export const subLocationsApi = {
  list: async (params?: QueryParams & { locationId?: number }) => {
    const response = await httpClient.get<ApiListResponse<SubLocation>>("/sub-locations", { params });
    return response.data;
  },
  getById: async (id: string) => {
    const response = await httpClient.get<ApiResponse<SubLocation>>(`/sub-locations/${id}`);
    return response.data;
  },
  create: async (payload: Partial<SubLocation>) => httpClient.post("/sub-locations", payload),
  update: async (id: string, payload: Partial<SubLocation>) =>
    httpClient.put(`/sub-locations/${id}`, payload),
  remove: async (id: string) => httpClient.delete(`/sub-locations/${id}`)
};
