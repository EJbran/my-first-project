import { httpClient } from "./httpClient";
import type { ApiListResponse, ApiResponse, QueryParams } from "../types/api.types";
import type { Epsa } from "../types/epsa.types";

export const epsasApi = {
  list: async (params?: QueryParams) => {
    const response = await httpClient.get<ApiListResponse<Epsa>>("/epsas", { params });
    return response.data;
  },
  getById: async (id: string) => {
    const response = await httpClient.get<ApiResponse<Epsa>>(`/epsas/${id}`);
    return response.data;
  },
  create: async (payload: Partial<Epsa>) => httpClient.post("/epsas", payload),
  update: async (id: string, payload: Partial<Epsa>) => httpClient.put(`/epsas/${id}`, payload),
  remove: async (id: string) => httpClient.delete(`/epsas/${id}`)
};
