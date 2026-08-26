import { httpClient } from "./httpClient";
import type { ApiListResponse, ApiResponse, QueryParams } from "../types/api.types";
import type { Bank } from "../types/bank.types";

export const banksApi = {
  list: async (params?: QueryParams) => {
    const response = await httpClient.get<ApiListResponse<Bank>>("/banks", { params });
    return response.data;
  },
  getById: async (id: string) => {
    const response = await httpClient.get<ApiResponse<Bank>>(`/banks/${id}`);
    return response.data;
  },
  create: async (payload: Partial<Bank>) => httpClient.post("/banks", payload),
  update: async (id: string, payload: Partial<Bank>) => httpClient.put(`/banks/${id}`, payload),
  remove: async (id: string) => httpClient.delete(`/banks/${id}`)
};
