import { httpClient } from "./httpClient";
import type { ApiListResponse, ApiResponse, QueryParams } from "../types/api.types";
import type { TransactionType } from "../types/transactionType.types";

export const transactionTypesApi = {
  list: async (params?: QueryParams) => {
    const safeParams = Object.fromEntries(
      Object.entries(params ?? {}).filter(([, value]) => value !== undefined && value !== "")
    );

    const response = await httpClient.get<ApiListResponse<TransactionType>>("/transaction-types", { params: safeParams });
    return response.data;
  },
  getById: async (id: string) => {
    const response = await httpClient.get<ApiResponse<TransactionType>>(`/transaction-types/${id}`);
    return response.data;
  },
  create: async (payload: Partial<TransactionType>) => httpClient.post("/transaction-types", payload),
  update: async (id: string, payload: Partial<TransactionType>) => httpClient.put(`/transaction-types/${id}`, payload),
  remove: async (id: string) => httpClient.delete(`/transaction-types/${id}`)
};
