import { httpClient } from "./httpClient";
import type { ApiListResponse, ApiResponse, QueryParams } from "../types/api.types";
import type { TimeSheetCode, TimeSheetCodePayload } from "../types/timeSheetCode.types";

export const timeSheetCodesApi = {
  list: async (params?: QueryParams) => {
    const response = await httpClient.get<ApiListResponse<TimeSheetCode>>(
      "/time-sheet-codes",
      { params }
    );
    return response.data;
  },
  getById: async (id: string) => {
    const response = await httpClient.get<ApiResponse<TimeSheetCode>>(
      `/time-sheet-codes/${id}`
    );
    return response.data;
  },
  create: async (payload: TimeSheetCodePayload) =>
    httpClient.post("/time-sheet-codes", payload),
  update: async (id: string, payload: TimeSheetCodePayload) =>
    httpClient.put(`/time-sheet-codes/${id}`, payload),
  remove: async (id: string) => httpClient.delete(`/time-sheet-codes/${id}`)
};
