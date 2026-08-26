import { httpClient } from "./httpClient";
import type { ApiListResponse, ApiResponse, QueryParams } from "../types/api.types";
import type { BankGeneral } from "../types/bankGeneral.types";

export const bankGeneralsApi = {
  list: async (params?: QueryParams) => {
    const response = await httpClient.get<ApiListResponse<BankGeneral>>("/bank-generals", { params });
    return response.data;
  },
  getById: async (id: string) => {
    const response = await httpClient.get<ApiResponse<BankGeneral>>(`/bank-generals/${id}`);
    return response.data;
  },
  create: async (payload: Partial<BankGeneral>) => httpClient.post("/bank-generals", payload),
  update: async (id: string, payload: Partial<BankGeneral>) =>
    httpClient.put(`/bank-generals/${id}`, payload),
  remove: async (id: string) => httpClient.delete(`/bank-generals/${id}`)
};
