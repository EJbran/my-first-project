import { httpClient } from "./httpClient";
import type { ApiListResponse, ApiResponse, QueryParams } from "../types/api.types";
import type { Holiday, HolidayPayload } from "../types/holiday.types";

export const holidaysApi = {
  list: async (params?: QueryParams) => {
    const response = await httpClient.get<ApiListResponse<Holiday>>("/holidays", { params });
    return response.data;
  },
  getById: async (id: string) => {
    const response = await httpClient.get<ApiResponse<Holiday>>(`/holidays/${id}`);
    return response.data;
  },
  create: async (payload: HolidayPayload) => httpClient.post("/holidays", payload),
  update: async (id: string, payload: HolidayPayload) =>
    httpClient.put(`/holidays/${id}`, payload),
  remove: async (id: string) => httpClient.delete(`/holidays/${id}`)
};
