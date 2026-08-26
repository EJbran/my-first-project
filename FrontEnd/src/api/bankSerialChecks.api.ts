import { httpClient } from "./httpClient";
import type { ApiListResponse, ApiResponse, QueryParams } from "../types/api.types";
import type { BankSerialCheck } from "../types/bankSerialCheck.types";

export type BankSerialCheckQuery = QueryParams & {
  bankId?: string | number;
};

export const bankSerialChecksApi = {
  list: async (params?: BankSerialCheckQuery) => {
    const response = await httpClient.get<ApiListResponse<BankSerialCheck>>("/bank-serial-checks", {
      params
    });
    return response.data;
  },
  getById: async (id: string) => {
    const response = await httpClient.get<ApiResponse<BankSerialCheck>>(`/bank-serial-checks/${id}`);
    return response.data;
  },
  create: async (payload: Partial<BankSerialCheck>) =>
    httpClient.post("/bank-serial-checks", payload),
  update: async (id: string, payload: Partial<BankSerialCheck>) =>
    httpClient.put(`/bank-serial-checks/${id}`, payload),
  remove: async (id: string) => httpClient.delete(`/bank-serial-checks/${id}`)
};
