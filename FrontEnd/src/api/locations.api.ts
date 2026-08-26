import { httpClient } from "./httpClient";
import type { ApiListResponse, ApiResponse, QueryParams } from "../types/api.types";
import type { Location } from "../types/location.types";

export const locationsApi = {
  list: async (params?: QueryParams) => {
    const response = await httpClient.get<ApiListResponse<Location>>("/locations", { params });
    return response.data;
  },
  getById: async (id: string) => {
    const response = await httpClient.get<ApiResponse<Location>>(`/locations/${id}`);
    return response.data;
  },
  create: async (payload: Partial<Location>) => httpClient.post("/locations", payload),
  update: async (id: string, payload: Partial<Location>) => httpClient.put(`/locations/${id}`, payload),
  remove: async (id: string) => httpClient.delete(`/locations/${id}`)
};
